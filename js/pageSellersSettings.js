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

		let form = Utils.getById('pageSellersSettingsForm');

		Utils.object2form( settings.page_sellers, form );

		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let page_sellers	= Utils.form2Object( form );
			settings.page_sellers = page_sellers;

			persistence.saveSettings( settings ).then(()=>
			{
				client.executeOnBackground('SettingsChange', settings );
			});
		});
	})
	.catch((e)=>
	{
		console.log('Error on pageSellersSettings',e);
	});
});
