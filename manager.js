const Flags = require('./flags')
const { calculatePosition } = require('./calculations')
const { log } = require('console')

const FL = 'flag',
	KI = 'kick',
	CA = 'catch'

const goalkeeper = [
	{ act: FL, fl: 'gr' },
	{ act: CA, fl: 'b', goal: 'gl' },
	{ act: KI, fl: 'b', goal: 'gl' },
]

const round = a => Math.round(a * 100) / 100

const Manager = {
	init(cmd, p, team, x, y) {
		this.p = p
		this.cmd = cmd
		this.team = team
		this.goal = false
		this.ball = null
		this.isolatedObservedFlags = []
		this.isolatedObservedFlagsNames = []
		this.observedFlags = []
		this.observedFlagsNames = []
		this.teammates = []
		this.opponents = []
		this.pos = { x, y }
		this.isLeader = false
		this.isViewBall = false

		this.processEnv(cmd, p)
		return this
	},
	extractFlagCoordsAndDistance(observedFlag) {
		let flagName = observedFlag.cmd.p.join('')
		return [
			Flags[flagName].x,
			Flags[flagName].y,
			observedFlag.p[0],
			observedFlag.p[1],
		]
	},
	extractFlagName(observedFlag) {
		return observedFlag.cmd.p.join('')
	},
	processEnv(cmd, p) {
		if (cmd == 'hear' && p[2].includes('goal')) {
			this.goal = true
			if (this.strat == 'kick')
				this.indexOfAct = (this.indexOfAct + 1) % actions.length
		}
		// Анализ сообщения
		if (cmd === 'see') {
			const xs = []
			const ys = []
			// console.log('до цикла', this.observedFlags)
			for (let i = 1; i < p.length; i++) {
				let objName = p[i].cmd.p.join('')

				// Flags
				if (Object.keys(Flags).includes(objName) && p[i].p.length >= 2) {
					this.observedFlags.push(p[i])
					this.observedFlagsNames.push(objName)
					// Flag
					let x = Flags[objName].x
					let y = Flags[objName].y
					if (!xs.includes(x) && ys.filter(el => y === el).length < 2) {
						this.isolatedObservedFlags.push(p[i])
						this.isolatedObservedFlagsNames.push(objName)
						xs.push(x)
						ys.push(y)
					}
				} // Teammate
				else if (
					p[i].cmd.p[0] === 'p' &&
					(p[i].cmd.p[1]
						? p[i].cmd.p[1].replace(/"/gi, '') === this.team
						: false)
				) {
					this.teammates.push(p[i])
				}
				// Opponent
				else if (p[i].cmd.p[0] === 'p' && p[i].cmd.p[1] !== this.team) {
					this.opponents.push(p[i])
				} //Ball
				else if (p[i].cmd.p[0] === 'b') {
					this.observedFlags.push(p[i])
					this.observedFlagsNames.push(objName)
					this.ball = p[i]
				}
			}

			this.isolatedObservedFlags.sort((a, b) => a.p[0] - b.p[0])
		}
	},
	getLocation() {
		if (this.isolatedObservedFlags.length < 3) {
			console.log('В зоне видимости нет трех флагов')
		} else {
			const [x1, y1, d1, alpha1] = this.extractFlagCoordsAndDistance(
				this.isolatedObservedFlags[0]
			)
			const [x2, y2, d2, alpha2] = this.extractFlagCoordsAndDistance(
				this.isolatedObservedFlags[1]
			)
			const [x3, y3, d3, alpha3] = this.extractFlagCoordsAndDistance(
				this.isolatedObservedFlags[2]
			)
			const [x, y] = calculatePosition(x1, y1, d1, x2, y2, d2, x3, y3, d3)
			// console.log(`игрок команды ${this.team}: X = ${round(x)} Y = ${round(y)}`)
			this.pos = { x, y }
			// console.log('getLocation', this.pos)
		}
		return this.pos
	},
	inPenaltyZone(side = 'r') {
		// console.log('inPenaltyZone', this.pos)
		const { x, y } = this.pos
		const { fprt, fprb, fplt, fplb } = Flags

		return (
			(side === 'r' && x > fprt.x && y > fprt.y && y < fprb.y) ||
			(side === 'l' && x < fplt.x && y > fplt.y && y < fplb.y)
		)
	},
	getTeamLocationFirstPlayer(ourTeam = true) {
		if (this.isolatedObservedFlags.length >= 2) {
			const [x1, y1, d1, alpha1] = this.extractFlagCoordsAndDistance(
				this.isolatedObservedFlags[0]
			)
			const [x2, y2, d2, alpha2] = this.extractFlagCoordsAndDistance(
				this.isolatedObservedFlags[1]
			)
			const { X, Y } = this.pos || this.getLocation()

			const teamArr = ourTeam ? this.teammates : this.opponents
			let pos = null

			if (teamArr.length) {
				const [da, alphaa] = [teamArr[0].p[0], teamArr[0].p[1]]
				const da1 = Math.sqrt(
					d1 * d1 +
						da * da -
						2 * d1 * da * Math.cos(Math.abs(alpha1 - alphaa) * (Math.PI / 180))
				)
				const da2 = Math.sqrt(
					d2 * d2 +
						da * da -
						2 * d2 * da * Math.cos(Math.abs(alpha2 - alphaa) * (Math.PI / 180))
				)
				const [XO, YO] = calculatePosition(x1, y1, da1, x2, y2, da2, X, Y, da)
				pos = { x: XO, y: YO }
				// console.log(
				// 	`игрок команды ${this.team} видит игрока команды ${
				// 		this.opponents[0].cmd.p[1]
				// 	}: X = ${round(XO)} Y = ${round(YO)}`
				// )
			}
			return pos
		} else return null
	},
	getVisible(flagName) {
		return this.observedFlagsNames.includes(flagName)
	},
	getDistance(flagName) {
		return this.observedFlags[this.observedFlagsNames.indexOf(flagName)].p[0]
	},
	getAngle(flagName) {
		// console.log(
		// 	'ANGLEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
		// 	this.observedFlags[this.observedFlagsNames.indexOf(flagName)].p[1]
		// )
		return this.observedFlags[this.observedFlagsNames.indexOf(flagName)].p[1]
	},
	getKickAngle(goal) {
		// console.log('this.observedFlags', this.observedFlags)
		// console.log('this.observedFlagsNames', this.observedFlagsNames)
		let indexGates = this.observedFlagsNames.indexOf(goal)
		if (indexGates !== -1) {
			return this.observedFlags[indexGates].p[1]
		} else {
			console.log('Не вижу ворота')
		}
		return 180
	},
	stopRunning() {
		return this.goal
	},
	getAction(dt) {
		// if (this.team == 'B') console.log('Наталия', goalkeeper[dt.state.next])
		const mgr = this
		function execute(dt, title) {
			const action = dt[title]
			// Exec node
			if (typeof action.exec == 'function') {
				action.exec(mgr, dt.state)
				return execute(dt, action.next)
			}
			// Condition node
			if (typeof action.condition == 'function') {
				const cond = action.condition(mgr, dt.state)
				if (cond) return execute(dt, action.trueCond)
				return execute(dt, action.falseCond)
			}
			// Command node
			if (typeof action.command == 'function') {
				return action.command(mgr, dt.state)
			}
			throw new Error(`Unexpected node in DT: ${title}`)
		}
		// console.log('kekakkaekkafejksf')
		return execute(dt, 'root')
	},
}

module.exports = Manager
