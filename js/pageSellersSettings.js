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

		let form = Utils.getById('pageSellersSettingsForm');

		Utils.object2form( settings.page_sellers, form );

		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let page_sellers	= Utils.form2Object( form );

			page_sellers.add_by_seller_preferences_next_day = 'add_by_seller_preferences_next_day' in page_sellers;
			page_sellers.add_by_seller_preferences_no_next_day = 'add_by_seller_preferences_no_next_day' in page_sellers;
			page_sellers.add_by_seller_preferences_amazon = 'add_by_seller_preferences_amazon' in page_sellers;
			page_sellers.add_by_seller_preferences_vendor = 'add_by_seller_preferences_vendor' in page_sellers;

			page_sellers.add_first	= 'add_first' in page_sellers;
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
