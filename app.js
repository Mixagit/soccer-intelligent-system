const readline = require('readline')
const Agent = require('./agent')
const Socket = require('./socket')
const VERSION = 7
const INPUT = true

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

	if (!INPUT) {
		c1 = await getUserInput('First player coordinates (x y):')
		c2 = await getUserInput('Second player coordinates (x y):')
		s = +(await getUserInput('First player rotation speed (s):'))
	} else {
		;[c1, c2, s] = [[-20, -5], [5, 10], 20]
	}

	let pA1 = new Agent(teamNameA, { name: 'spin', speed: s })
	// let pB1 = new Agent(teamNameB)

	await Socket(pA1, pA1.team, VERSION)
	// await Socket(pB1, pB1.team, VERSION)

	await pA1.socketSend('move', `${c1[0]} ${c1[1]}`)
	// await pB1.socketSend('move', `${-c2[0]} ${-c2[1]}`)
})()
