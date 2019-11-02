/// <reference types="node" />
import { Duplex } from 'stream';
import { Channel } from './Multiplex';
import MessageBus from './MessageBus';
import { NetworkMsg } from './NetworkMsg';
export interface SocketInfo {
    type: 'tcp' | 'utp';
    isClient: boolean;
    onClose?(): void;
}
export default class PeerConnection {
    networkBus: MessageBus<NetworkMsg>;
    isClient: boolean;
    isConfirmed: boolean;
    type: SocketInfo['type'];
    private rawSocket;
    private multiplex;
    private secureStream;
    private onClose?;
    constructor(rawSocket: Duplex, info: SocketInfo);
    readonly isOpen: boolean;
    readonly isClosed: boolean;
    openChannel(name: string): Channel;
    close(): Promise<void>;
}