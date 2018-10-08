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

			page_sellers.add_first	= 'close_tab' in page_sellers;
			page_sellers.add_amazon = 'add_amazon' in page_sellers;
			page_sellers.add_first_prime = 'add_first_prime' in page_sellers;
			page_sellers.close_tab	= 'close_tab' in page_sellers;
			page_sellers.go_to_next	= 'go_to_next' in page_sellers;
			page_sellers.add_if_only_one = 'add_if_only_one' in page_sellers;

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
