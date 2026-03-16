declare function setPrototypeOf(o: any, proto: object | null): any;
export = setPrototypeOf;
el-map';
import getSideChannelWeakMap from 'side-channel-weakmap';

declare namespace getSideChannel {
	type Channel<K, V> =
		| getSideChannelList.Channel<K, V>
		| ReturnType<Exclude<typeof getSideChannelMap<K, V>, false>>
		| ReturnType<Exclude<typeof getSideChannelWeakMap<K, V>, false>>;
}

declare function getSideChannel<K, V>(): getSideChannel.Channel<K, V>;

export = getSideChannel;
