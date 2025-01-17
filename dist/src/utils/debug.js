import { isObject } from './types.js'

// Two seedable random number generators
export function randomSeedSin(seed = Math.PI / 4) {
    // ~3.4 million b4 repeat.
    // https://stackoverflow.com/a/19303725/1791917
    return () => {
        const x = Math.sin(seed++) * 10000
        return x - Math.floor(x)
    }
}
export function randomSeedParkMiller(seed = 123456) {
    // doesn't repeat b4 JS dies.
    // https://gist.github.com/blixt/f17b47c62508be59987b
    seed = seed % 2147483647
    return () => {
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
    }
}
// Replace Math.random with one of these
export function randomSeed(seed, useParkMiller = true) {
    Math.random = useParkMiller
        ? randomSeedParkMiller(seed)
        : randomSeedSin(seed)
}

// Print a message just once.
let logOnceMsgSet
export function logOnce(msg) {
    if (!logOnceMsgSet) logOnceMsgSet = new Set()
    if (!logOnceMsgSet.has(msg)) {
        console.log(msg)
        logOnceMsgSet.add(msg)
    }
}
export function warn(msg) {
    logOnce('Warning: ' + msg)
}

// Print a message to an html element
// Default to document.body if in browser.
// If msg is an object, convert to JSON
// (object canot have cycles etc)
export function printToPage(msg, element = document.body) {
    if (isObject(msg)) {
        msg = JSON.stringify(msg, null, 2)
        msg = '<pre>' + msg + '</pre>'
    }

    element.style.fontFamily = 'monospace'
    element.innerHTML += msg + '<br />'
}

// export function logHistogram(name, array) {
//     // const hist = AgentArray.fromArray(dataset.data).histogram()
//     const hist = histogram(array)
//     const { min, max } = hist.parameters
//     console.log(
//         `${name}:`, // name + ':'
//         hist.toString(),
//         'min/max:',
//         min.toFixed(3),
//         max.toFixed(3)
//     )
// }

// Use chrome/ffox/ie console.time()/timeEnd() performance functions
export function timeit(f, runs = 1e5, name = 'test') {
    name = name + '-' + runs
    console.time(name)
    for (let i = 0; i < runs; i++) f(i)
    console.timeEnd(name)
}

// simple performance function.
// Records start & current time, steps, fps
// Each call bumps steps, current time, fps
// Use:
//    const perf = fps()
//    while (perf.steps != 100) {}
//        model.step()
//        perf()
//    }
//    console.log(`Done, steps: ${perf.steps} fps: ${perf.fps}`)
export function fps() {
    const start = performance.now()
    let steps = 0
    function perf() {
        steps++
        const ms = performance.now() - start
        const fps = parseFloat((steps / (ms / 1000)).toFixed(2))
        Object.assign(perf, { fps, ms, start, steps })
    }
    perf.steps = 0
    return perf
}

// Print Prototype Stack: see your vars all the way down!
export function pps(obj, title = '') {
    if (title) console.log(title) // eslint-disable-line
    let count = 1
    let str = ''
    while (obj) {
        if (typeof obj === 'function') {
            str = obj.constructor.toString()
        } else {
            const okeys = Object.keys(obj)
            str =
                okeys.length > 0
                    ? `[${okeys.join(', ')}]`
                    : `[${obj.constructor.name}]`
        }
        console.log(`[${count++}]: ${str}`)
        obj = Object.getPrototypeOf(obj)
    }
}

// Merge from's key/val pairs into to the global/window namespace
export function toWindow(obj, logToo = false) {
    Object.assign(window, obj)
    console.log('toWindow:', Object.keys(obj).join(', '))
    if (logToo) {
        Object.keys(obj).forEach(key => console.log('  ', key, obj[key]))
    }
}

// Use JSON to return pretty, printable string of an object, array, other
// Remove ""s around keys. Will fail on circular structures.
// export function objectToString(obj) {
//     return JSON.stringify(obj, null, '  ')
//         .replace(/ {2}"/g, '  ')
//         .replace(/": /g, ': ')
// }
// // Like above, but a single line for small objects.
// export function objectToString1(obj) {
//     return JSON.stringify(obj)
//         .replace(/{"/g, '{')
//         .replace(/,"/g, ',')
//         .replace(/":/g, ':')
// }
