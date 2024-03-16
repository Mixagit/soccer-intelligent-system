function calculatePosition(x1, y1, d1, x2, y2, d2, x3, y3, d3) {
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

module.exports = {
	calculatePosition,
}
