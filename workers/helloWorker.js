import util from '../src/util.js'
import HelloModel from '../models/HelloModel.js'
console.log('worker self', self)

let model, params

function postData() {
    const data = {
        turtles: model.turtles.typedSample({
            x: Float32Array,
            y: Float32Array,
            theta: Float32Array,
        }),
        links: model.links.typedSample({
            x0: Float32Array,
            y0: Float32Array,
            x1: Float32Array,
            y1: Float32Array,
        }),
    }
    postMessage(data, util.oofaBuffers(data))
    model.tick()
}

onmessage = e => {
    if (e.data.cmd === 'init') {
        params = e.data.params
        if (params.seed != null) util.randomSeed(params.seed)

        model = new HelloModel(params.world)
        model.population = params.population
        model.setup()

        console.log('worker: params', params, 'model:', model)
        postData()
    } else if (e.data.cmd === 'step') {
        if (model.ticks < params.steps) {
            model.step()
            postData()
        } else {
            postMessage('done')
        }
    } else {
        console.log('Oops, unknown message: ', e)
    }
}
