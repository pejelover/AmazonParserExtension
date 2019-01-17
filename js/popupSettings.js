import Persistence from './Persistence.js';
import Utils from './Diabetes/Util.js';
import default_settings from './default_settings.js';
import Client from './extension-framework/Client.js';

var settings = default_settings;

document.addEventListener('DOMContentLoaded',()=>
{
	let persistence = new Persistence();

	let client	= new Client();

	persistence.init()
	.then(()=>
	{
		return persistence.getSettings();
	})
	.then((savedSettings)=>
	{
		if( savedSettings )
			settings = savedSettings;

		console.log( savedSettings );

		let form = Utils.getById('popupSettingsForm');

		Utils.object2form( settings, form );

		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let parseStatus = Utils.form2Object( form );

			settings.parse_status	 = parseStatus.parse_status;

			persistence.saveSettings( settings ).then(()=>
			{
				client.executeOnBackground('SettingsChange', settings );
			});
		});
	})
	.catch((e)=>
	{
		console.error('This must never happen',e);
	});

	document.getElementById('openBackup').addEventListener('click',(evt)=>
	{
		client.executeOnBackground('OpenBackup',{});
	});
});
