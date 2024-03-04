const Msg = require('./msg')
const readline = require('readline')
const Flags = require('./flags')
const { log } = require('console')
const actions = [
	{ act: 'kick', fl: 'b', goal: 'gr' },
	{ act: 'flag', fl: 'gl' },
	{ act: 'flag', fl: 'frb' },
	{ act: 'flag', fl: 'fc' },
]

const round = a => Math.round(a * 100) / 100

class Agent {
	constructor(team, strat = null) {
		this.position = 'l' // По умолчанию ~ левая половина поля
		this.run = false // ИГра начата
		this.act = null // Действия
		this.rl = readline.createInterface({
			// Чтение консоли
			input: process.stdin,
			output: process.stdout,
		})
		this.team = team
		this.strat = strat
		this.indexOfAct = 0

		this.rl.on('line', input => {
			// Обработка строки из кон—
			if (this.run) {
				// Если игра начата
				// ДВижения вперед, вправо, влево, удар по мячу

				if ('w' == input) this.act = { n: 'dash', v: 100 }
				if ('d' == input) this.act = { n: 'turn', v: 20 }
				if ('a' == input) this.act = { n: 'turn', v: -20 }
				if ('s' == input) this.act = { n: 'kick', v: 100 }
			}
		})
	}
	msgGot(msg) {
		// Получение сообщения
		let data = msg.toString('utf8') // ПРиведение
		this.processMsg(data) // Разбор сообщения
		this.sendCmd() // Отправка команды
	}
	setSocket(socket) {
		// Настройка сокета
		this.socket = socket
	}
	async socketSend(cmd, value) {
		// Отправка команды
		await this.socket.sendMsg(`(${cmd} ${value})`)
	}
	processMsg(msg) {
		// Обработка сообщения
		let data = Msg.parseMsg(msg) // Разбор сообщения
		if (!data) throw new Error('Parse error\n' + msg)
		// Первое (hear) — начало игры
		if (data.cmd == 'hear' && data.p[2] == 'play_on') this.run = true
		if (data.cmd == 'init') this.initAgent(data.p) //MHMnmaflM3auMH
		this.analyzeEnv(data.msg, data.cmd, data.p) // Обработка
	}
	initAgent(p) {
		if (p[0] == 'r') this.position = 'r' // Правая половина поля
		if (p[1]) this.id = p[1] // id игрока
	}
	analyzeEnv(msg, cmd, p) {
		if (cmd == 'hear' && p[2].includes('goal')) {
			this.run = false
			console.log('GOAAAAAAAAAAAAAAAAAAAL')
			if (this.strat == 'kick')
				this.indexOfAct = (this.indexOfAct + 1) % actions.length
		}
		// Анализ сообщения
		if (cmd === 'see') {
			const observedFlags = []
			const allFlags = []
			const allNamesFlags = []
			const observedNamesFlags = []
			const opponents = []
			let isViewBall = false
			const xs = []
			for (let i = 1; i < p.length; i++) {
				let flagName = p[i].cmd.p.join('')
				if (Object.keys(Flags).includes(flagName) && p[i].p.length >= 2) {
					allFlags.push(p[i])
					allNamesFlags.push(flagName)
					// Flag
					let x = Flags[flagName].x
					if (!xs.includes(x)) {
						observedFlags.push(p[i])
						observedNamesFlags.push(flagName)
						xs.push(x)
					}
				} else if (p[i].cmd.p[0] === 'p' && p[i].cmd.p[1] !== this.team) {
					// Opponent
					opponents.push(p[i])
				} else if (p[i].cmd.p[0] === 'b') {
					isViewBall = true
					// Ball
					if (this.strat === 'kick') {
						const distanseBall = p[i].p[0]
						const angleBall = p[i].p[1]

						if (angleBall) {
							this.act = { n: 'turn', v: angleBall }
						} else if (distanseBall > 0.5) {
							this.act = { n: 'dash', v: 100 }
						} else {
							// console.log('allFlags', allFlags)
							const indexGate = allNamesFlags.indexOf(
								actions[this.indexOfAct].goal
							)
							let angleGate = null
							if (indexGate !== -1) {
								for (let i = 0; i < allFlags.length; i++) {
									if (this.extractFlagName(allFlags[i]) === 'gr') {
										angleGate = allFlags[i].p[1]
									}
								}

								// console.log('angleGate', angleGate)
								this.act = { n: 'kick', v: `100 ${angleGate}` }
							} else {
								this.act = { n: 'kick', v: `10 45` }
							}
						}
					}
				}
			}

			this.strat = actions[this.indexOfAct].act
			// act with ball
			if (this.strat === 'kick' && !isViewBall) {
				this.act = { n: 'turn', v: 90 }
			}

			// act with flags
			const indexViewFlag = allNamesFlags.indexOf(actions[this.indexOfAct].fl)

			if (this.strat === 'flag' && indexViewFlag === -1) {
				this.act = { n: 'turn', v: 90 }
			}
			if (indexViewFlag !== -1) {
				const distanseFlag = allFlags[indexViewFlag].p[0]
				const angleFlag = allFlags[indexViewFlag].p[1]
				// console.log('angleFlag', angleFlag)
				if (angleFlag) {
					this.act = { n: 'turn', v: angleFlag }
				} else if (distanseFlag > 3) {
					this.act = { n: 'dash', v: 100 }
				} else {
					this.indexOfAct = (this.indexOfAct + 1) % actions.length
				}
			}

			//evelon192
			if (observedFlags.length < 3) {
				console.log('В зоне видимости нет трех флагов')
				return
			}

			observedFlags.sort((a, b) => a.p[0] - b.p[0])

			const extractFlagCoordsAndDistance = observedFlag => {
				let flagName = observedFlag.cmd.p.join('')
				return [
					Flags[flagName].x,
					Flags[flagName].y,
					observedFlag.p[0],
					observedFlag.p[1],
				]
			}

			const [x1, y1, d1, alpha1] = extractFlagCoordsAndDistance(
				observedFlags[0]
			)
			const [x2, y2, d2, alpha2] = extractFlagCoordsAndDistance(
				observedFlags[1]
			)
			const [x3, y3, d3, alpha3] = extractFlagCoordsAndDistance(
				observedFlags[2]
			)
			const [X, Y] = this.calculatePosition(x1, y1, d1, x2, y2, d2, x3, y3, d3)

			// console.log(
			// 	`${this.id} игрок команды ${this.team}: X = ${round(X)} Y = ${round(Y)}`
			// )

			// Opponent
			if (opponents.length) {
				const [da, alphaa] = [opponents[0].p[0], opponents[0].p[1]]
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
				const [XO, YO] = this.calculatePosition(
					x1,
					y1,
					da1,
					x2,
					y2,
					da2,
					X,
					Y,
					da
				)
				// console.log(
				// 	`${this.id} игрок команды ${this.team} видит игрока команды ${
				// 		opponents[0].cmd.p[1]
				// 	}: X = ${round(XO)} Y = ${round(YO)}`
				// )
			}
		}
	}
	extractFlagName(observedFlag) {
		return observedFlag.cmd.p.join('')
	}
	calculatePosition(x1, y1, d1, x2, y2, d2, x3, y3, d3) {
		const alpha1 = (y1 - y2) / (x2 - x1)
		const beta1 =
			(y2 * y2 - y1 * y1 + x2 * x2 - x1 * x1 + d1 * d1 - d2 * d2) /
			(2 * (x2 - x1))
		const alpha2 = (y1 - y3) / (x3 - x1)
		const beta2 =
			(y3 * y3 - y1 * y1 + x3 * x3 - x1 * x1 + d1 * d1 - d3 * d3) /
			(2 * (x3 - x1))
		const delta_beta = beta1 - beta2
		const delta_alpha = alpha2 - alpha1
		const X = alpha1 * (delta_beta / delta_alpha) + beta1
		const Y = delta_beta / delta_alpha
		return [X, Y]
	}
	sendCmd() {
		if (this.run) {
			// Игра начата
			if (this.act) this.socketSend(this.act.n, this.act.v)
			this.act = null // Сброс команды
		}
	}
}

module.exports = Agent // Экспорт игрока
