type L = () => void;
const subs = new Set<L>();

export function subscribeChatUnreadRefresh(cb: L) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function notifyChatUnreadChanged() {
  for (const cb of subs) cb();
}
