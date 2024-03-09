const Msg = require('./msg')
const readline = require('readline')
const Flags = require('./flags')
const actions = [
	{ act: 'flag', fl: 'gl' },
	{ act: 'kick', fl: 'b', goal: 'gr' },
]
const { calculatePosition } = require('./calculations')

const Manager = require('./manager')
const { DT } = require('./decisionTree')

class Agent {
	constructor(team) {
		this.position = 'l' // По умолчанию ~ левая половина поля
		this.run = false // Игра начата
		this.act = null // Действия
		this.rl = readline.createInterface({
			// Чтение консоли
			input: process.stdin,
			output: process.stdout,
		})
		this.team = team
		this.strat = null
		this.indexOfAct = 0

		this.rl.on('line', input => {
			// Обработка строки из кон—
			if (this.run) {
				// Если игра начата
				// Движения вперед, вправо, влево, удар по мячу
				if ('w' == input) this.act = { n: 'dash', v: 100 }
				if ('d' == input) this.act = { n: 'turn', v: 20 }
				if ('a' == input) this.act = { n: 'turn', v: -20 }
				if ('s' == input) this.act = { n: 'kick', v: 100 }
			}
		})
	}
	msgGot(msg) {
		// Получение сообщения
		let data = msg.toString('utf8') // Приведение
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
		if (data.cmd == 'init') this.initAgent(data.p) // Инициализация
		this.analyzeEnv(data.msg, data.cmd, data.p) // Обработка
	}
	initAgent(p) {
		if (p[0] == 'r') this.position = 'r' // Правая половина поля
		if (p[1]) this.id = p[1] // id игрока
	}
	analyzeEnv(msg, cmd, p) {
		const dt = Object.create(DT)
		const mgr = Object.create(Manager)

		mgr.init(cmd, p, this.team)

		if (mgr.stopRunning()) {
			this.run = false
			dt.state.next = 0
		}

		if (cmd == 'see') {
			const pos = mgr.getLocation()
			// const teammate = mgr.getTeamLocationFirstPlayer()
			// const opponent = mgr.getTeamLocationFirstPlayer(false)

			// console.log(pos)
			// console.log(teammate);
			// console.log(opponent);

			if (this.run) this.act = mgr.getAction(dt)
		}
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
