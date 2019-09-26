"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = __importDefault(require("./Queue"));
// NOTE: Joshua Wise (maintainer of better-sqlite3) suggests using multiple
// prepared statements rather than batch inserts and selects :shrugging-man:.
// We'll see if this becomes an issue.
class ClockStore {
    constructor(store) {
        this.updateLog = new Queue_1.default();
        this.store = store;
        this.preparedGet = this.store.db.prepare('SELECT * FROM DocumentClock WHERE documentId=?');
        this.preparedInsert = this.store.db.prepare(`INSERT INTO DocumentClock (documentId, feedId, seq) 
       VALUES (?, ?, ?) 
       ON CONFLICT (documentId, feedId) 
       DO UPDATE SET seq=excluded.seq WHERE excluded.seq > seq`);
        this.preparedDelete = this.store.db.prepare('DELETE FROM DocumentClock WHERE documentId=?');
    }
    /**
     * TODO: handle missing clocks better. Currently returns an empty clock (i.e. an empty object)
     * @param documentId
     */
    get(documentId) {
        const clockRows = this.preparedGet.all(documentId);
        return rowsToClock(clockRows);
    }
    /**
     * Retrieve the clocks for all given documents. If we don't have a clock
     * for a document, the resulting ClockMap won't have an entry for that document id.
     * @param documentIds
     */
    getMultiple(documentIds) {
        const transaction = this.store.db.transaction((docIds) => {
            return docIds.reduce((clockMap, docId) => {
                const clock = this.get(docId);
                if (clock)
                    clockMap[docId] = clock;
                return clockMap;
            }, {});
        });
        const clockMap = transaction(documentIds);
        return clockMap;
    }
    /**
     * Update an existing clock with a new clock, merging the two.
     * If no clock exists in the data store, the new clock is stored as-is.
     * @param documentId
     * @param clock
     */
    update(documentId, clock) {
        const transaction = this.store.db.transaction((clockEntries) => {
            clockEntries.forEach(([feedId, seq]) => {
                this.preparedInsert.run(documentId, feedId, seq);
            });
            return this.get(documentId);
        });
        const updatedClock = transaction(Object.entries(clock));
        const update = [documentId, updatedClock];
        this.updateLog.push(update);
        return update;
    }
    /**
     * Hard set of a clock. Will clear any clock values that exist for the given document id
     * and set explicitly the passed in clock.
     * @param documentId
     * @param clock
     */
    set(documentId, clock) {
        const transaction = this.store.db.transaction((documentId, clock) => {
            this.preparedDelete.run(documentId);
            return this.update(documentId, clock);
        });
        return transaction(documentId, clock);
    }
}
exports.default = ClockStore;
function rowsToClock(rows) {
    return rows.reduce((clock, row) => {
        clock[row.feedId] = row.seq;
        return clock;
    }, {});
}
function rowsToClockMap(rows) {
    return rows.reduce((clockMap, row) => {
        const clock = clockMap[row.documentId] || {};
        clock[row.feedId] = row.seq;
        clockMap[row.documentId] = clock;
        return clockMap;
    }, {});
}
//# sourceMappingURL=ClockStore.js.map