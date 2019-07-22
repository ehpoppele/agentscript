import Color from '../src/Color.js'
import ColorMap from '../src/ColorMap.js'
import Animator from '../src/Animator.js'
import GUI from '../src/GUI.js'
import TwoView from '../src/TwoView.js'
import FloodModel from '../models/FloodModel.js'
import util from '../src/util.js'
util.toWindow({ Color, ColorMap, Animator, GUI, TwoView, HelloModel, util })

const template = {
    fps: { value: 20, extent: [5, 60, 5], cmd: fps => anim.setRate(fps) },
    speed: { value: 0.1, extent: [0.01, 0.5, 0.01] },
    wiggle: { value: 0.2, extent: [0, 1, 0.1] },
    patchSize: { value: 12, extent: [1, 20, 1] },
    shape: { value: 'dart', extent: ['dart', 'circle', 'square'] },
    shapeSize: { value: 1, extent: [0.5, 5, 0.5] },
    run: { value: () => anim.toggle() },
    population: { value: 10, extent: [10, 1000, 10] },
}
const controls = new GUI(template).target

/*

Controls for flood:
Rainfall setRate; 0-25
Run/stop
visual Patch size display
Run-off edges boolean





*/
