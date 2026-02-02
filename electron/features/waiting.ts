export const waiting = (timer: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('');
    }, timer * 1000);
  })
}