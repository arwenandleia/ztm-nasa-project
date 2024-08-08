const { getHabitablePlanets } = require("../../models/planets.model.js")

// get HABITABLE planets function is get ALL planets in the video

async function httpGetAllPlanets(req, res) {
	return res.status(200).json(await getHabitablePlanets())
}

module.exports = {
	httpGetAllPlanets,
}
