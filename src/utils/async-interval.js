/*  A wrapper function that is going to call an async function (@fn)
*   and schedule another call in @interval ms.
*
*   In order to stop the interval call the returned function (@stop)
*
*
*   @fn  - the function that will be called over and over again
*   @interval - the interval between each call in ms
*
*   returns a @stop function which purpose is to
*   stop any following @fn calls.
*
*   i.e
*
*   const stop = asyncInterval(
  *     () => new Promise(
*       resolve => resolve("anything")
*     ), 1000
*   )
*
*   stop();
* */

const asyncInterval = (fn, interval) => {

  let shouldHalt = false;

  const tick = (asyncFn, interval) => {
    if (shouldHalt) {
      return;
    }

    try {
      asyncFn().then(() => {
        // Small optimization to avoid scheduling a new function call.
        if (shouldHalt) {
          return;
        }

        setTimeout(
          () => tick(asyncFn, interval),
          interval
        );
      },() => console.error("The call was rejected"));
    } catch (error) {
      console.error("Something went wrong with the call");
    }

  };

  tick(fn, interval);

  return () => shouldHalt = true;
};

export default asyncInterval;