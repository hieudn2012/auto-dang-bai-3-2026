// wait random from to ms
export const waitRandom = async (from: number, to: number) => {
  const ms = Math.floor(Math.random() * (to - from + 1) + from);
  await new Promise(resolve => setTimeout(resolve, ms));
}