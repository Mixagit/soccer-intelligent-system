const readline = require('readline')
const Agent = require('./agent')
const Socket = require('./socket')
const VERSION = 7
const INPUT = false

const teamNameA = 'A'
const teamNameB = 'B'

async function getUserInput(prompt) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})
	const it = rl[Symbol.asyncIterator]()

	console.log(prompt)
	const input = (await it.next()).value.split(' ').map(a => +a)

	rl.close()
	return input
}

;(async () => {
	let c1, c2, s

	if (INPUT) {
		c1 = await getUserInput('First player coordinates (x y):')
		c2 = await getUserInput('Second player coordinates (x y):')
		s = +(await getUserInput('First player rotation speed (s):'))
	} else {
		;[c1, c2, s] = [[-20, -5], [5, 10], 20]
	}

	// let pA1 = new Agent(teamNameA, 'player')
	let pA1 = new Agent(teamNameA, 'passer', true)
	let pA2 = new Agent(teamNameA, 'goaler')

	let pB1 = new Agent(teamNameB, 'bolvan')
	let pB2 = new Agent(teamNameB, 'bolvan')

	await Socket(pA1, pA1.team, VERSION)
	await Socket(pA2, pA2.team, VERSION)

	await Socket(pB1, pB1.team, VERSION)
	await Socket(pB2, pB2.team, VERSION)

	await pA1.socketSend('move', `${c1[0]} ${c1[1]}`)
	await pA2.socketSend('move', '-20 0')

	await pB1.socketSend('move', '-52 7')
	await pB2.socketSend('move', '-52 -7')
})()
