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

		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let form				= Utils.getById('pageProductSettingsForm');
			let productPageSettings = Utils.form2Object( form );

			productPageSettings.close_tab	=  'close_tab' in productPageSettings;
			productPageSettings.add_to_cart =  'add_to_cart' in productPageSettings;
			productPageSettings.close_if_stock_found	= 'close_if_stock_found' in productPageSettings;
			productPageSettings.goto_sellers_pages		=  'goto_sellers_pages' in productPageSettings;
			productPageSettings.timeout					= 'timeout' in productPageSettings ? parseInt( productPageSettings.timeout ,10 ) : 0;

			if( isNaN( productPageSettings.timeout ) )
			{
				productPageSettings.timeout = 0;
			}

			settings.page_product = productPageSettings;

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
