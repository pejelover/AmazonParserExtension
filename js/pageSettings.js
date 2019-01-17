import Persistence from './Persistence.js';
import default_settings from './default_settings.js';
import Utils from './Diabetes/Util.js';
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

		let form = Utils.getById('pageProductSettingsForm');

		Utils.object2form( settings.page_product, form );

	})
	.catch((e)=>
	{
		console.error('This must never happen',e);
	});

	document.getElementById('saveSettingsButton').addEventListener('click',()=>
	{

	});
});
