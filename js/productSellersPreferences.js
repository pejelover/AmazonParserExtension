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

		let form = Utils.getById('productSellersPreferencesForm');

		let value = '';

		if( 'product_sellers_preferences' in settings && settings.product_sellers_preferences )
		{
			for(let key in settings.product_sellers_preferences )
			{
				settings.product_sellers_preferences[ key ].forEach((seller_id)=>
				{
					value += key+':'+seller_id+"\n";
				});
			}
		}

		Utils.getById('productSellersPreferences').value = value;


		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let psp	= Utils.getById('productSellersPreferences').value.trim();

			let array = psp.split(/\n/g);

			let keyValues = {};

			array.forEach((i)=>
			{
				let tokens = i.replace(/ /g,'').split(/[:\s]/);

				if( tokens.length == 2 && tokens[1].trim() !== "" )
				{
					let asin = tokens[0].trim();

					if( asin in keyValues )
						keyValues[ asin ].push( tokens[1].trim() );
					else
						keyValues[ asin ] = [ tokens[ 1 ].trim() ];
				}
			});

			settings.product_sellers_preferences = keyValues;

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
