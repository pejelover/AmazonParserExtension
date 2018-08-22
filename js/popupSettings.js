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

		console.log( savedSettings );

		let form = Utils.getById('popupSettingsForm');

		Utils.object2form( settings, form );

		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let parseStatus = Utils.form2Object( form );

			settings.parse_status	 = parseStatus.parse_status;

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
