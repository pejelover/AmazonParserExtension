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

		let form = Utils.getById('pagePrevCartSettingsForm');

		Utils.object2form( settings.page_previous_cart, form );

		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let prevCartSettings	= Utils.form2Object( form );
			settings.page_previous_cart	= prevCartSettings;

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
});
