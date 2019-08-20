import World from '../src/World.js'
import Color from '../src/Color.js'
import ColorMap from '../src/ColorMap.js'
import Animator from '../src/Animator.js'
import GUI from '../src/GUI.js'
import TwoView from '../src/TwoView.js'
import PedestrianModel from '../models/Pedestrian.js'
import util from '../src/util.js'
util.toWindow({ Color, ColorMap, Animator, GUI, TwoView, PedestrianModel, util })

const template = {
    speed: { value: 1, extent: [0, 5, 0.5] },
    patchSize: { value: 7, extent: [1, 20, 1] },
    run: { value: () => anim.toggle() },
}
const controls = new GUI(template).target

class PedestrianModelCtrl extends PedestrianModel {
    step() {
        this.speed = controls.speed
        super.step()
      }
  }


  //set default params
  const params = {
      worldSize: 64,
      steps: 500,
      speed: 0.5,
      populationDensity: 90,
      dangerSize: 20,
      barriers: 0,
      timePriority: 8,
  }

  const timeoutMS = 0

  const patchPixels = {
      exit: [0, 255, 0],
      obstacle: [255, 0, 0],
      seed: [0, 0, 255],
      path: [0, 0, 0],
      danger: [255, 165, 0],
  }

  Object.assign(params, util.parseQueryString())
  const world = World.defaultWorld(params.worldSize)
  const model = new PedestrianModelCtrl(world)

  model.worldSize = params.worldSize
  model.speed = params.speed
  model.dangerSize = params.dangerSize
  model.populationDensity = params.populationDensity
  model.barriers = params. barriers
  model.timePriority = params.timePriority
  const steps = params.steps
  const colors = ColorMap.Basic16


 function modelStart() {
    model.setup()
    console.log('startup done')
  }

  class EvacView extends TwoView {
      initPatches() {
          this.createPatchPixels(i => Color.randomGrayPixel(0, 100))
      }
      draw() {
          if (controls.patchSize !== view.patchSize) {
              view.reset(controls.patchSize)
          }
          if (!this.draws) this.draws = 0
          if (this.draws === 0) this.initPatches()

          this.clear()
          this.drawPatches(model.patches, p => Color.rgbaToPixel(patchPixels[p.type][0], patchPixels[p.type][1], patchPixels[p.type][2] )) // redraw patches colors
          //this.drawLinks(model.links, { color: colors.gray.css, width: 1 })
          this.drawTurtles(model.turtles, p => ({
            shape: 'circle',
            color: 'yellow',
            size: 1,
          }))
          this.draws++
      }
  }
  const view = new EvacView('modelDiv', model.world, {
      useSprites: true,
      patchSize: controls.patchSize,
  })

  const anim = new Animator(model, view, controls.fps)
  modelStart()
  anim.start()
  util.toWindow({ template, controls, model, view, colors, anim })
