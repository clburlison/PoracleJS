const _ = require('lodash')
const config = require('config')

let monsterDataPath = `${__dirname}/../../../util/monsters.json`
if (_.includes(['de', 'fr', 'ja', 'ko', 'ru'], config.locale.language.toLowerCase())) {
	monsterDataPath = `${__dirname}/../../../util/locale/monsters${config.locale.language.toLowerCase()}.json`
}
const monsterData = require(monsterDataPath)
const typeData = require(`${__dirname}/../../../util/types`)
const formData = require(`${__dirname}/../../../util/forms`)

module.exports = (ctx) => {

	const { controller, command } = ctx.state
	const user = ctx.update.message.from
	const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''
	const args = command.splitArgs

	let target = { id: user.id.toString(), name: user.first_name }
	if (!_.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group') {
		return ctx.telegram.sendMessage(user.id, 'Please run commands in Direct Messages').catch((O_o) => {
			controller.log.error(O_o.message)
		})
	}
	if (_.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group') target = { id: ctx.update.message.chat.id.toString(), name: ctx.update.message.chat.title }
	controller.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group') {
				return ctx.reply(`${channelName} does not seem to be registered. add it with /channel add`).catch((O_o) => {
					controller.log.error(O_o.message)
				})
			}
			if (!isregistered && ctx.update.message.chat.type === 'private') {
				return ctx.telegram.sendMessage(user.id, `You don't seem to be registered. \nYou can do this by sending /poracle to @${controller.config.telegram.channel}`).catch((O_o) => {
					controller.log.error(O_o.message)
				})
			}
			if (isregistered) {

				const monsters = []
				let park = 0
				let distance = 0
				let team = 4
				let template = 3
				let remove = false
				let levels = []
				const form = 0
				const forms = []

				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
					if (pid !== undefined) monsters.push(pid)
					else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
						const Type = element.replace(/\b\w/g, l => l.toUpperCase())
						_.filter(monsterData, (o, k) => {
							if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
								if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
							}
							return k
						})
					}
				})
				args.forEach((element) => {
					if (element.toLowerCase() === 'ex') park = 1
					else if (element.match(/level\d/gi)) levels.push(element.replace(/level/gi, ''))
					else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
					else if (element.match(/instinct/gi)) team = 3
					else if (element.match(/valor/gi)) team = 2
					else if (element.match(/mystic/gi)) team = 1
					else if (element.match(/harmony/gi)) team = 0
					else if (element.match(/remove/gi)) remove = true
					else if (element.match(/form\w/gi)) forms.push(element.replace(/form/gi, ''))
					else if (element.match(/everything/gi)) levels = [1, 2, 3, 4, 5]
					else if (element.match(/d\d/gi)) {
						distance = element.replace(/d/gi, '')
						if (distance.length >= 10) distance = distance.substr(0, 9)
					}
				})
				if (!remove) {
					if (monsters.length !== 0 && levels.length === 0 && forms.length === 0) {
						const level = 0
						const insertData = monsters.map(monster => [target.id, monster, template, distance, park, team, level, form])
						controller.query.insertOrUpdateQuery(
							'raid',
							['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level', 'form'],
							insertData,
						).catch((O_o) => {})
						controller.log.log({
							level: 'debug',
							message: `${user.first_name} started tracking ${monsters} raids in ${target.name}`,
							event: 'telegram:raid',
						})

						ctx.reply('✅').catch((O_o) => {
							controller.log.error(O_o.message)
						})

					}
					else if (monsters.length === 1 && levels.length === 0 && forms.length !== 0) {
						const level = 0
						if (!_.has(formData, monsters[0])) {
							return ctx.reply(`Sorry, ${monsters[0]} doesn't have forms`).catch((O_o) => {
								controller.log.error(O_o.message)
							})
						}
						const fids = []
						forms.forEach((f) => {
							const fid = _.findKey(formData[monsters[0]], monforms => monforms.toLowerCase() === f)
							if (fid) fids.push(fid)
						})
						if (!fids.length) {
							return ctx.reply(`Didn't find these forms for ${monsters[0]}`).catch((O_o) => {
								controller.log.error(O_o.message)
							})
						}
						const insertData = fids.map(f => [target.id, monsters[0], template, distance, park, team, level, f])
						controller.query.insertOrUpdateQuery(
							'raid',
							['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level', 'form'],
							insertData,
						).catch((O_o) => {})
						controller.log.log({
							level: 'debug',
							message: `${user.first_name} started tracking ${monsters} raids in ${target.name}`,
							event: 'telegram:raid',
						})

						ctx.reply('✅').catch((O_o) => {
							controller.log.error(O_o.message)
						})

					}
					else if (monsters.length === 0 && levels.length === 0) ctx.reply('404 NO MONSTERS FOUND')
					else if (monsters.length !== 0 && levels.length !== 0) ctx.reply('400 Can\'t track raids by name and level at the same time')
					else if (monsters.length === 0 && levels.length !== 0) {
						const insertData = levels.map(level => [target.id, 721, template, distance, park, team, level, form])
						controller.query.insertOrUpdateQuery(
							'raid',
							['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level', 'form'],
							insertData,
						).catch((O_o) => {})
						controller.log.log({
							level: 'debug',
							message: `${user.first_name} started tracking level ${levels} raids in ${target.name}`,
							event: 'telegram:raid',
						})
						ctx.reply('✅').catch((O_o) => {
							controller.log.error(O_o.message)
						})
					}
				}
				else {
					if (monsters.length) {
						monsters.forEach((monster) => {
							controller.query.deleteByIdQuery('raid', 'pokemon_id', `${monster}`, target.id).catch((O_o) => {})
						})
						controller.log.log({ level: 'debug', message: `${user.first_name} stopped tracking ${monsters} raids in ${target.name}`, event: 'telegram:unraid' })
						ctx.reply('✅').catch((O_o) => {
							controller.log.error(O_o.message)
						})
					}
					if (levels.length) {
						levels.forEach((level) => {
							controller.query.deleteByIdQuery('raid', 'level', `${level}`, target.id).catch((O_o) => {})
						})
						controller.log.log({ level: 'debug', message: `${user.first_name} stopped tracking level ${levels} raids in ${target.name}`, event: 'telegram:unraid' })

						ctx.reply('✅').catch((O_o) => {
							controller.log.error(O_o.message)
						})
					}
					if (!monsters.length && !levels.length) {
						ctx.reply('404 No raid bosses or levels found').catch((O_o) => {
							controller.log.error(O_o.message)
						})
					}
				}
			}
		})
		.catch((err) => {
			controller.log.error(`Telegram commando /raid errored with: ${err.message} (command was "${command.text}")`)
		})
}