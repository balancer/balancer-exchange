import { useCallback, useEffect, useRef, useState } from 'react';
import copy from 'copy-to-clipboard';

export function useInterval(callback, delay) {
    const savedCallback = useRef();

    // Remember the latest function.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

export function useCopyClipboard(timeout = 500) {
    const [isCopied, setIsCopied] = useState(false);

    const staticCopy = useCallback(text => {
        const didCopy = copy(text);
        setIsCopied(didCopy);
    }, []);

    useEffect(() => {
        if (isCopied) {
            const hide = setTimeout(() => {
                setIsCopied(false);
            }, timeout);

            return () => {
                clearTimeout(hide);
            };
        }
    }, [isCopied, setIsCopied, timeout]);

    return [isCopied, staticCopy];
}

// modified from https://usehooks.com/usePrevious/
export function usePrevious(value) {
    // The ref object is a generic container whose current property is mutable ...
    // ... and can hold any value, similar to an instance property on a class
    const ref = useRef();

    // Store current value in ref
    useEffect(() => {
        ref.current = value;
    }, [value]); // Only re-run if value changes

    // Return previous value (happens before update in useEffect above)
    return ref.current;
}
