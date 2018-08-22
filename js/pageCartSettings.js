
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

		let form = Utils.getById('pageCartSettingsForm');

		Utils.object2form( settings.page_product, form );

		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let cartSettings = Utils.form2Object( form );

			cartSettings.parse_stock = 'parse_stock' in cartSettings;
			cartSettings.close_tab	= 'close_tab' in cartSettings;

			settings.page_cart = cartSettings;

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
