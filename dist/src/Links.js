import AgentSet from './AgentSet.js'

// Links are a collection of all the Link objects between turtles.
class Links extends AgentSet {
    // Use AgentSeet ctor: constructor (model, AgentClass, name)

    // Factory: Add 1 or more links from the from turtle to the to turtle(s) which
    // can be a single turtle or an array of turtles. The optional init
    // proc is called on the new link after inserting in the agentSet.
    createOne(from, to, initFcn) {
        const link = this.addAgent()
        link.init(from, to)
        initFcn(link)
        return link
    }
    create(from, to, initFcn = link => {}) {
        if (!Array.isArray(to)) return this.createOne(from, to, initFcn)
        // if (!Array.isArray(to)) to = [to]
        // Return array of new links. REMIND: should be agentarray?
        return to.map(t => {
            // REMIND: skip dups
            // const link = this.addAgent()
            // link.init(from, t)
            // initFcn(link)
            // return link
            return this.createOne(from, t, initFcn)
        }) // REMIND: return single link if to not an array?
    }
}

export default Links
