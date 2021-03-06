import Persistence from './Persistence.js';
import Utils from './Diabetes/Util.js';
import Client from './extension-framework/Client.js';
import default_settings from './default_settings.js';

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

		let form = Utils.getById('pageSearchSettingsForm');

		Utils.object2form( settings.page_search, form );

		Utils.getById('saveSettingsButton').addEventListener('click',()=>
		{
			let search_settings = Utils.form2Object( form );
			settings.page_search =  search_settings;

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
