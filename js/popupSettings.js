
document.addEventListener('DOMContentLoaded',()=>
{
	console.log("hell yeah");

	let persistence = new Persistence();

	let client	= new Client();

	persistence.init()
	.then(()=>
	{
		return persistence.getSettings();
	})
	.then((settings)=>
	{
		let ids = [
			'follow_products'
			,'follow_offers'
			,'follow_stock'
			,'close_tabs'
		];

		ids.forEach(( i ) =>{
			document.getElementById( i ).checked = settings[ i ];
		});


		let radios = Array.from( document.querySelectorAll('input[type="radio"]') );

		radios.forEach((i)=>
		{
			let value = i.getAttribute('value');
			i.addEventListener('click',(evt)=>
			{
				let follow_options = Array.from( document.querySelectorAll('input[type="checkbox"]') );
				follow_options.forEach((j)=>
				{
					j.disabled = value === 'parse_disabled';
				});
			});
		});

		document.getElementById( settings.parse_status ).click();
		document.getElementById('saveSettingsButton').addEventListener('click',()=>
		{
			let toSave	= {
				id	: 1
			};

			ids.forEach(( i ) =>{
				toSave[ i ] = document.getElementById( i ).checked;
			});

			toSave.parse_status = document.querySelector('input[name="parse_status"]:checked').value;
			persistence.saveSettings( toSave ).then(()=>
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
