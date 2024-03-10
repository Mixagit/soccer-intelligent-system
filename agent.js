const Msg = require('./msg')
const readline = require('readline')

const Manager = require('./manager')
const { DT } = require('./decisionTree')

class Agent {
	constructor(team, role = 'player', isLeader = false) {
		this.position = 'l' // По умолчанию ~ левая половина поля
		this.run = false // Игра начата
		this.act = null // Действия
		this.rl = readline.createInterface({
			// Чтение консоли
			input: process.stdin,
			output: process.stdout,
		})
		this.x = null
		this.y = null
		// this.leadershipDefined = false
		this.isLeader = isLeader
		this.team = team
		this.didHearGo = false
		this.role = role
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
		if (data.cmd == 'hear' && data.p[2] == '"go"') this.didHearGo = true
		this.analyzeEnv(data.msg, data.cmd, data.p) // Обработка
	}
	initAgent(p) {
		if (p[0] == 'r') this.position = 'r' // Правая половина поля
		if (p[1]) this.id = p[1] // id игрока
		this.dt = Object.create(DT[this.role]).init()
	}
	async analyzeEnv(msg, cmd, p) {
		const mgr = Object.create(Manager).init(cmd, p, this.team, this.x, this.y)
		mgr.isLeader = this.isLeader
		mgr.didHearGo = this.didHearGo
		if (mgr.stopRunning()) {
			this.dt.state.kickDone = false
			this.dt.state.didHearGo = false
			this.didHearGo = false
			this.run = false
			this.dt.state.next = 0
			if (this.strat == 'passer') await this.socketSend('move', '-20 0')
			if (this.strat == 'goaler') await this.socketSend('move', '-20 -20')
		}

		if (cmd == 'see') {
			const pos = mgr.getLocation()
			;[this.x, this.y] = [pos.x, pos.y]
			const teammate = mgr.getTeamLocationFirstPlayer()
			const opponent = mgr.getTeamLocationFirstPlayer(false)

			console.log('this.isLeader', this.isLeader)
			console.log('this.pos', pos)

			if (this.run) this.act = mgr.getAction(this.dt)
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
