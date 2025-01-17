import util from './util.js'
import AgentArray from './AgentArray.js'
import AgentSet from './AgentSet.js'

// Turtles are the world other agentsets live on. They create a coord system
// from Model's world values: size, minX, maxX, minY, maxY
class Turtles extends AgentSet {
    // Use AgentSet ctr: constructor (model, AgentClass, name)
    createOne(initFcn) {
        const turtle = this.addAgent()
        turtle.theta = util.randomFloat(Math.PI * 2)
        initFcn(turtle)
        return turtle
    }
    create(num = 1, initFcn = turtle => {}) {
        if (num === 1) return this.createOne(initFcn)
        return util.repeat(num, (i, a) => {
            const turtle = this.addAgent()
            turtle.theta = util.randomFloat(Math.PI * 2)
            initFcn(turtle)
            // Return array of new agents. REMIND: should be agentarray?
            a.push(turtle)
        })
    }

    // Return a random valid float x,y point in turtle coord space.
    randomPt() {
        const { minXcor, maxXcor, minYcor, maxYcor } = this.model.world
        return [
            util.randomFloat2(minXcor, maxXcor),
            util.randomFloat2(minYcor, maxYcor),
        ]
    }

    // Return an array of this breed within the array of patchs
    inPatches(patches) {
        let array = new AgentArray() // []
        for (const p of patches) array.push(...p.turtlesHere())
        // REMIND: can't use withBreed .. its not an AgentSet. Move to AgentArray?
        if (this.isBreedSet()) array = array.filter(a => a.agentSet === this)
        return array
    }
    // Return an array of turtles/breeds within the patchRect, dx/y integers
    // Note: will return turtle too. Also slightly inaccurate due to being
    // patch based, not turtle based.
    inPatchRect(turtle, dx, dy = dx, meToo = false) {
        // meToo: true for patches, could have several turtles on patch
        const patches = this.model.patches.inRect(turtle.patch, dx, dy, true)
        const agents = this.inPatches(patches)
        // don't use agents.removeAgent: breeds
        if (!meToo) util.removeArrayItem(agents, turtle)
        // if (!meToo) util.removeItem(agents, turtle)
        return agents // this.inPatches(patches)
    }
    // Return the members of this agentset that are within radius distance
    // from me, using a patch rect.
    inRadius(turtle, radius, meToo = false) {
        const agents = this.inPatchRect(turtle, radius, radius, true)
        return agents.inRadius(turtle, radius, meToo)
    }
    inCone(turtle, radius, coneAngle, meToo = false) {
        const agents = this.inPatchRect(turtle, radius, radius, true)
        return agents.inCone(turtle, radius, coneAngle, turtle.theta, meToo)
    }

    // Circle Layout: position the turtles in this breed in an equally
    // spaced circle of the given radius, with the initial turtle
    // at the given start angle (default to pi/2 or "up") and in the
    // +1 or -1 direction (counter clockwise or clockwise)
    // defaulting to -1 (clockwise).
    layoutCircle(
        radius,
        center = [0, 0],
        startAngle = Math.PI / 2,
        direction = -1
    ) {
        const dTheta = (2 * Math.PI) / this.length
        const [x0, y0] = center
        this.ask((turtle, i) => {
            turtle.setxy(x0, y0)
            turtle.theta = startAngle + direction * dTheta * i
            turtle.forward(radius)
        })
    }
}

export default Turtles
