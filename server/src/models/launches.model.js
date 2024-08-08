const axios = require("axios")

const launchesDatabase = require("./launches.mongo")
const planets = require("./planets.mongo")

const launches = new Map()

const DEFAULT_FLIGHT_NUMBER = 100

const SPACEX_API_URL = "https://api.spacexdata.com/v4/launches/query"

async function populateLaunches() {
	console.log("Downloading Launch data")
	const response = await axios.post(SPACEX_API_URL, {
		query: {},
		options: {
			pagination: false,
			populate: [
				{
					path: "rocket",
					select: {
						name: 1,
					},
				},
				{
					path: "payloads",
					select: {
						customers: 1,
					},
				},
			],
		},
	})

	if (response.status !== 200) {
		console.log("problem downloading launch data")
		throw new Error("Launch Data download failed!")
	}

	const launchDocs = response.data.docs
	for (const launchDoc of launchDocs) {
		const payloads = launchDoc["payloads"]
		const customers = payloads.flatMap((payload) => {
			return payload["customers"]
		})

		const launch = {
			flightNumber: launchDoc["flight_number"],
			mission: launchDoc["name"],
			rocket: launchDoc["rocket"]["name"],
			launchDate: launchDoc["date_local"],
			upcoming: launchDoc["upcoming"],
			success: launchDoc["success"],
			customers: customers,
		}

		console.log(`${launch.flightNumber} ${launch.mission}`)
		await saveLaunch(launch)
	}
}

async function loadLaunchesData() {
	const firstLaunch = await findLaunch({
		flightNumber: 1,
		rocket: "Falcon 1",
		mission: "FalconSat",
	})

	if (firstLaunch) {
		console.log("launch data already loaded")
		return
	} else {
		console.log(firstLaunch)

		await populateLaunches()
	}
}

async function getLatestFlightNumber() {
	const latestLaunch = await launchesDatabase.findOne().sort("-flightNumber")

	if (!latestLaunch) {
		return DEFAULT_FLIGHT_NUMBER
	}

	return latestLaunch.flightNumber
}

async function getAllLaunches(skip, limit) {
	return await launchesDatabase
		.find({}, { _id: 0, __v: 0 })
		.sort({ flightNumber: 1 })
		.skip(skip)
		.limit(limit)
}

async function saveLaunch(launch) {
	await launchesDatabase.findOneAndUpdate(
		{
			flightNumber: launch.flightNumber,
		},
		launch,
		{ upsert: true }
	)
}

async function scheduleNewLaunch(launch) {
	const planet = await planets.findOne({
		keplerName: launch.target,
	})

	if (!planet) {
		throw new Error("No Matching planet found")
	}

	const newFlightNumber = (await getLatestFlightNumber()) + 1

	const newLaunch = Object.assign(launch, {
		success: true,
		upcoming: true,
		customers: ["Dixi", "NASA"],
		flightNumber: newFlightNumber,
	})

	await saveLaunch(newLaunch)
}

// DB implementation ABOVE
async function findLaunch(filter) {
	return await launchesDatabase.findOne(filter)
}

async function existsLaunchWithId(launchId) {
	return await findLaunch({
		flightNumber: launchId,
	})
}

async function abortLaunchById(launchId) {
	const aborted = await launchesDatabase.updateOne(
		{
			flightNumber: launchId,
		},
		{
			upcoming: false,
			success: false,
		}
	)
	// console.log(aborted)

	return aborted.modifiedCount === 1
}

module.exports = {
	getAllLaunches,
	scheduleNewLaunch,
	existsLaunchWithId,
	abortLaunchById,
	loadLaunchesData,
}
