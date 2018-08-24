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
				value += key+':'+settings.product_sellers_preferences[ key ].join(",")+"\n";
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
				let values = tokens[1].split(',');
				if( tokens.length == 2 && tokens[1].trim() !== "" )
				{
					keyValues[ tokens[0].trim() ] = tokens[1].split(",");
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
