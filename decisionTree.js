const { log } = require('console')

const FL = 'flag',
	KI = 'kick',
	CA = 'catch'

const player = [
	{ act: FL, fl: 'fprt' },
	{ act: KI, fl: 'b', goal: 'gr' },
]
const goalkeeper = [
	{ act: FL, fl: 'gr' },
	{ act: CA, fl: 'b', goal: 'gl' },
	{ act: KI, fl: 'b', goal: 'gl' },
]

const passer = [
	{ act: FL, fl: 'fplc' },
	{ act: KI, fl: 'b', goal: 'teammate' },
]

const goaler = [
	{ act: FL, fl: 'fplb' },
	{ act: FL, fl: 'fgrb' },
	{ act: KI, fl: 'b', goal: 'gr' },
]

const DT = {
	player: {
		init() {
			this.state = {
				next: 0,
				addOneToNext() {
					this.next = (this.next + 1) % this.sequence.length
				},
				sequence: player,
				command: null,
			}
			return this
		},
		root: {
			exec(mgr, state) {
				state.action = state.sequence[state.next]
				state.command = null
			},
			next: 'goalVisible',
		},
		goalVisible: {
			condition: (mgr, state) => mgr.getVisible(state.action.fl),
			trueCond: 'rootNext',
			falseCond: 'rotate',
		},
		rotate: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '90' }
			},
			next: 'sendCommand',
		},
		rootNext: {
			condition: (mgr, state) => state.action.act == FL,
			trueCond: 'flagSeek',
			falseCond: 'ballSeek',
		},

		runNearBall: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 10 }
			},
			next: 'sendCommand',
		},

		nearBall: {
			condition: (mgr, state) => mgr.getDistance(state.action.fl) < 2,
			trueCond: 'runNearBall',
			falseCond: 'closeFlag',
		},

		flagSeek: {
			condition: (mgr, state) => mgr.getDistance(state.action.fl) < 25,
			trueCond: 'nearBall',
			falseCond: 'farGoal',
		},
		closeFlag: {
			exec(mgr, state) {
				state.next++
				state.action = state.sequence[state.next]
			},
			next: 'goalVisible',
		},
		farGoal: {
			condition: (mgr, state) => Math.abs(mgr.getAngle(state.action.fl)) >= 2,
			trueCond: 'rotateToGoal',
			falseCond: 'runToGoal',
		},
		rotateToGoal: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.getAngle(state.action.fl) }
			},
			next: 'sendCommand',
		},
		runToGoal: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 100 }
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},

		ballSeek: {
			condition: (mgr, state) => mgr.getDistance(state.action.fl) < 0.5,
			trueCond: 'closeBall',
			falseCond: 'farGoal',
		},
		closeBall: {
			condition: (mgr, state) => mgr.getVisible(state.action.goal),
			trueCond: 'ballGoalVisible',
			falseCond: 'ballGoalInvisible',
		},
		ballGoalVisible: {
			exec(mgr, state) {
				state.command = {
					n: 'kick',
					v: `100 ${mgr.getAngle(state.action.goal)}`,
				}
			},
			next: 'sendCommand',
		},
		ballGoalInvisible: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: '10 45' }
			},
			next: 'sendCommand',
		},
	},
	goalkeeper: {
		init() {
			this.state = {
				next: 0,
				increaseNext() {
					this.next = (this.next + 1) % this.sequence.length
				},
				sequence: goalkeeper,
				command: null,
			}
			return this
		},
		root: {
			exec(mgr, state) {
				state.action = state.sequence[state.next]
				state.command = null
			},
			next: 'checkBall',
		},
		checkBall: {
			condition: (mgr, state) =>
				state.action.act === FL &&
				mgr.inPenaltyZone() &&
				mgr.getVisible('b') &&
				3 > mgr.getDistance('b'),
			trueCond: 'switchToBall',
			falseCond: 'goalVisible',
		},
		switchToBall: {
			exec(mgr, state) {
				state.next = state.sequence.length - 1
				state.action = state.sequence[state.next]
			},
			next: 'goalVisible',
		},
		goalVisible: {
			condition: (mgr, state) => mgr.getVisible(state.action.fl),
			trueCond: 'rootNext1',
			falseCond: 'rotate',
		},
		rotate: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '90' }
			},
			next: 'sendCommand',
		},
		rootNext1: {
			condition: (mgr, state) => state.action.act == FL,
			trueCond: 'flagSeek',
			falseCond: 'rootNext2',
		},
		rootNext2: {
			condition: (mgr, state) => state.action.act == CA,
			trueCond: 'ballSeek',
			falseCond: 'goToBall',
		},
		flagSeek: {
			condition: (mgr, state) => 5 > mgr.getDistance(state.action.fl),
			trueCond: 'closeFlag',
			falseCond: 'farGoal',
		},
		closeFlag: {
			exec(mgr, state) {
				state.increaseNext()
				state.action = state.sequence[state.next]
			},
			next: 'goalVisible',
		},
		farGoal: {
			condition: (mgr, state) => Math.abs(mgr.getAngle(state.action.fl)) > 4,
			trueCond: 'rotateToGoal',
			falseCond: 'runToGoal',
		},
		rotateToGoal: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.getAngle(state.action.fl) }
			},
			next: 'sendCommand',
		},
		runToGoal: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 100 }
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},
		ballSeek: {
			condition: (mgr, state) => 16 > mgr.getDistance(state.action.fl),
			trueCond: 'ballClose',
			falseCond: 'stay',
		},

		rotateToBall: {
			condition: (mgr, state) => mgr.getAngle(state.action.fl) > 2,
			trueCond: 'rotateToGoal',
			falseCond: 'runToGoal',
		},

		ballClose: {
			condition: (mgr, state) =>
				2 > mgr.getDistance(state.action.fl) && mgr.inPenaltyZone(),
			trueCond: 'ballTooClose',
			falseCond: 'rotateToBall',
		},
		ballTooClose: {
			condition: (mgr, state) =>
				0.5 > Math.abs(mgr.getDistance(state.action.fl)),
			trueCond: 'ballKick',
			falseCond: 'catchBall',
		},
		catchBall: {
			exec(mgr, state) {
				state.command = { n: 'catch', v: `${mgr.getAngle(state.action.fl)}` }
				state.increaseNext()
			},
			next: 'sendCommand',
		},
		goToBall: {
			condition: (mgr, state) =>
				0.5 > mgr.getDistance(state.action.fl) && mgr.inPenaltyZone(),
			trueCond: 'ballKick',
			falseCond: 'runToGoal',
		},
		ballKick: {
			exec(mgr, state) {
				state.command = {
					n: 'kick',
					v: `100 ${mgr.getKickAngle(state.action.goal)}`,
				}
				state.increaseNext()
			},
			next: 'sendCommand',
		},
		stay: {
			exec(mgr, state) {
				state.command = null
			},
			next: 'sendCommand',
		},
	},
	groupPlayer: {
		init() {
			this.state = {
				next: 0,
				increaseNext() {
					this.next = (this.next + 1) % this.sequence.length
				},
				sequence: player,
				command: null,
			}
			return this
		},
		root: {
			exec(mgr, state) {
				state.action = state.sequence[state.next]
				state.command = null
			},
			next: 'isLeader',
		},
		isLeader: {
			condition: (mgr, state) => mgr.isLeader,
			trueCond: 'goalVisible',
			falseCond: 'leaderVisible',
		},
		leaderVisible: {
			condition: (mgr, state) => mgr.teammates.length > 0,
			trueCond: 'closeToLeader',
			falseCond: 'rotate90',
		},
		closeToLeader: {
			condition: (mgr, state) =>
				mgr.teammates[0].cmd.p[0] <= 1 &&
				Math.abs(mgr.teammates[0].p[1]) < 40,
			trueCond: 'rotate30',
			falseCond: 'farToLeader',
		},
		farToLeader: {
			condition: (mgr, state) => mgr.teammates[0].p[0] > 10,
			trueCond: 'goToLeader',
			falseCond: 'midDistToLeader',
		},
		midDistToLeader: {
			condition: (mgr, state) =>
				mgr.teammates[0].cmd.p[1] > 40 || mgr.teammates[0].p[1] < 25,
			trueCond: 'rotateMinus30',
			falseCond: 'midMidDistToLeader',
		},
		midMidDistToLeader: {
			condition: (mgr, state) => mgr.teammates[0].p[0] < 7,
			trueCond: 'dash20',
			falseCond: 'dash40',
		},
		goToLeader: {
			condition: (mgr, state) => Math.abs(mgr.teammates[0].p[1]) > 5,
			trueCond: 'rotateToLeader',
			falseCond: 'runToGoal',
		},
		rotateToLeader: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.teammates[0].p[1] }
			},
			next: 'sendCommand',
		},
		goalVisible: {
			condition: (mgr, state) => mgr.getVisible(state.action.fl),
			trueCond: 'rootNext',
			falseCond: 'rotate90',
		},
		rotate90: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '90' }
			},
			next: 'sendCommand',
		},
		rotate30: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '30' }
			},
			next: 'sendCommand',
		},
		rotateMinus30: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '-30' }
			},
			next: 'sendCommand',
		},
		rootNext: {
			condition: (mgr, state) => state.action.act == FL,
			trueCond: 'flagSeek',
			falseCond: 'ballSeek',
		},
		flagSeek: {
			condition: (mgr, state) => 3 > mgr.getDistance(state.action.fl),
			trueCond: 'closeFlag',
			falseCond: 'farGoal',
		},
		closeFlag: {
			exec(mgr, state) {
				state.increaseNext()
				state.action = state.sequence[state.next]
			},
			next: 'goalVisible',
		},
		farGoal: {
			condition: (mgr, state) => Math.abs(mgr.getAngle(state.action.fl)) > 4,
			trueCond: 'rotateToGoal',
			falseCond: 'runToGoal',
		},
		rotateToGoal: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.getAngle(state.action.fl) }
			},
			next: 'sendCommand',
		},
		runToGoal: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 100 }
			},
			next: 'sendCommand',
		},
		dash20: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 20 }
			},
			next: 'sendCommand',
		},
		dash40: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 40 }
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},
		ballSeek: {
			condition: (mgr, state) => 0.5 > mgr.getDistance(state.action.fl),
			trueCond: 'closeBall',
			falseCond: 'farGoal',
		},
		closeBall: {
			// exec(mgr, state) {
			// 	state.command = { n: 'kick', v: `100 ${mgr.getKickAngle(state.action.goal)}` };
			// },
			// next: 'sendCommand',
			condition: (mgr, state) => mgr.getVisible(state.action.goal),
			trueCond: 'ballGoalVisible',
			falseCond: 'ballGoalInvisible',
		},
		ballGoalVisible: {
			exec(mgr, state) {
				state.command = {
					n: 'kick',
					v: `100 ${mgr.getAngle(state.action.goal)}`,
				}
			},
			next: 'sendCommand',
		},
		ballGoalInvisible: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: '10 45' }
			},
			next: 'sendCommand',
		},
	},
	passer: {
		init() {
			this.state = {
				kickDone: false,
				next: 0,
				increaseNext() {
					this.next = (this.next + 1) % this.sequence.length
				},
				sequence: passer,
				command: null,
			}
			return this
		},
		root: {
			exec(mgr, state) {
				state.action = state.sequence[state.next]
				state.command = null
			},
			next: 'isKickDone',
		},
		isKickDone: {
			condition: (mgr, state) => {
				return state.kickDone
			},
			trueCond: 'stand',
			falseCond: 'goalVisible',
		},
		stand: {
			exec(mgr, state) {
				state.command = { n: 'say', v: 'go' }
			},
			next: 'sendCommand',
		},
		goalVisible: {
			condition: (mgr, state) => mgr.getVisible(state.action.fl),
			trueCond: 'rootNext',
			falseCond: 'rotate',
		},
		rotate: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '90' }
			},
			next: 'sendCommand',
		},
		rootNext: {
			condition: (mgr, state) => state.action.act == FL,
			trueCond: 'flagSeek',
			falseCond: 'ballSeek',
		},
		flagSeek: {
			condition: (mgr, state) => 3 > mgr.getDistance(state.action.fl),
			trueCond: 'closeFlag',
			falseCond: 'farGoal',
		},
		closeFlag: {
			exec(mgr, state) {
				state.increaseNext()
				state.action = state.sequence[state.next]
			},
			next: 'goalVisible',
		},
		farGoal: {
			condition: (mgr, state) => Math.abs(mgr.getAngle(state.action.fl)) > 4,
			trueCond: 'rotateToGoal',
			falseCond: 'runToGoal',
		},
		rotateToGoal: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.getAngle(state.action.fl) }
			},
			next: 'sendCommand',
		},
		runToGoal: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 100 }
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},
		ballSeek: {
			condition: (mgr, state) => 0.5 > mgr.getDistance(state.action.fl),
			trueCond: 'closeBall',
			falseCond: 'farGoal',
		},
		closeBall: {
			// exec(mgr, state) {
			// 	state.command = { n: 'kick', v: `100 ${mgr.getKickAngle(state.action.goal)}` };
			// },
			// next: 'sendCommand',
			condition: (mgr, state) => mgr.teammates.length > 0,
			trueCond: 'ballGoalVisible',
			falseCond: 'ballGoalInvisible',
		},
		ballGoalVisible: {
			exec(mgr, state) {
				state.kickDone = true
				state.command = {
					n: 'kick',
					v: `${mgr.teammates[0].p[0] + 30} 
					${mgr.teammates[0].p[1] - 70}`,
				}
			},
			next: 'sendCommand',
		},
		ballGoalInvisible: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: '10 45' }
			},
			next: 'sendCommand',
		},
	},
	goaler: {
		init() {
			this.state = {
				next: 0,
				increaseNext() {
					this.next = (this.next + 1) % this.sequence.length
				},
				sequence: goaler,
				command: null,
			}
			return this
		},
		root: {
			exec(mgr, state) {
				state.action = state.sequence[state.next]
				state.command = null
			},
			next: 'goalVisible',
		},
		goalVisible: {
			condition: (mgr, state) => {
				if (mgr.getVisible('b') && state.next == 1 && mgr.didHearGo) {
					state.next = 2
					state.action = state.sequence[state.next]
				}
				return mgr.getVisible(state.action.fl)
			},
			trueCond: 'rootNext',
			falseCond: 'rotate',
		},
		rotate: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '90' }
			},
			next: 'sendCommand',
		},
		rootNext: {
			condition: (mgr, state) => state.action.act == FL,
			trueCond: 'flagSeek',
			falseCond: 'ballSeek',
		},
		flagSeek: {
			condition: (mgr, state) => 3 > mgr.getDistance(state.action.fl),
			trueCond: 'closeFlag',
			falseCond: 'farGoal',
		},
		closeFlag: {
			exec(mgr, state) {
				state.increaseNext()
				state.action = state.sequence[state.next]
			},
			next: 'goalVisible',
		},
		farGoal: {
			condition: (mgr, state) => Math.abs(mgr.getAngle(state.action.fl)) > 4,
			trueCond: 'rotateToGoal',
			falseCond: 'runToGoal',
		},
		rotateToGoal: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.getAngle(state.action.fl) }
			},
			next: 'sendCommand',
		},
		runToGoal: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 100 }
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},
		ballSeek: {
			condition: (mgr, state) => 0.5 > mgr.getDistance(state.action.fl),
			trueCond: 'closeBall',
			falseCond: 'farGoal',
		},
		closeBall: {
			// exec(mgr, state) {
			// 	state.command = { n: 'kick', v: `100 ${mgr.getKickAngle(state.action.goal)}` };
			// },
			// next: 'sendCommand',
			condition: (mgr, state) => mgr.getVisible(state.action.goal),
			trueCond: 'ballGoalVisible',
			falseCond: 'ballGoalInvisible',
		},
		ballGoalVisible: {
			exec(mgr, state) {
				state.command = {
					n: 'kick',
					v: `100 ${mgr.getAngle(state.action.goal)}`,
				}
			},
			next: 'sendCommand',
		},
		ballGoalInvisible: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: '10 45' }
			},
			next: 'sendCommand',
		},
	},
	bolvan: {
		init() {
			this.state = {
				// kickDone: false,
				next: 0,
				increaseNext() {
					this.next = (this.next + 1) % this.sequence.length
				},
				sequence: passer,
				command: null,
			}
			return this
		},
		root: {
			exec(mgr, state) {
				state.command = null
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},
	},
}

module.exports = { DT }
