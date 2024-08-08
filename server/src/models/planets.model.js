const fs = require("fs")
const path = require("path")

const { parse } = require("csv-parse")

const planets = require("./planets.mongo")

// const habitablePlanets = []

function isHabitablePlanet(planet) {
	return (
		planet["koi_disposition"] === "CONFIRMED" &&
		planet["koi_insol"] > 0.36 &&
		planet["koi_insol"] < 1.11 &&
		planet["koi_prad"] < 1.6
	)
}

/*
Create a promise--- that way the stream is read and then the habitable planets are returned!!
const promise = new Promise();
promise.then(...)
*/

async function loadPlanetsData() {
	return new Promise((resolve, reject) => {
		fs.createReadStream(
			path.join(__dirname, "..", "..", "data", "kepler_data.csv")
		)
			.pipe(
				parse({
					comment: "#",
					columns: true,
				})
			)
			.on("data", async (data) => {
				if (isHabitablePlanet(data)) {
					// habitablePlanets.push(data)
					//TODO: Replace below with  upsert = insert+update
					savePlanet(data)
				}
			})
			.on("error", (err) => {
				console.log(err)
				reject(err)
			})
			.on("end", async () => {
				const countPlanetsFound = (await getHabitablePlanets()).length
				console.log(`${countPlanetsFound} Habitable planets found`)

				resolve()
			})
	})
}

//Data abstraction to save planet data to mongo

async function savePlanet(planet) {
	try {
		await planets.updateOne(
			{
				keplerName: planet.kepler_name,
			},
			{
				keplerName: planet.kepler_name,
			},
			{
				upsert: true,
			}
		)
	} catch (err) {
		console.error(`Could not save planet ${err}`)
	}
}

//Abstraction to create a data access layer
// get HABITABLE planets function is get ALL planets in the video

async function getHabitablePlanets() {
	// return habitablePlanets
	const listOfPlanets = await planets.find(
		{},
		{
			__v: 0,
			_id: 0,
		}
	)
	// console.log(listOfPlanets)
	return listOfPlanets
}

module.exports = {
	loadPlanetsData,
	getHabitablePlanets,
}
