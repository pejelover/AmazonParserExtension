

document.addEventListener('DOMContentLoaded', function()
{

	var persistence = new Persistence();
	persistence.init();

	let date = new Date();

	let f = (d)=>{
		return d < 10 ? "0"+d: d;
	};

	Utils.getById("date1").value = date.getFullYear()+"-"+f( date.getMonth()+1 )+"-"+date.getDate();
	//Utils.getById("date2").value = date1.toISOString();


	//var ext = new Client();

	chrome.windows.getCurrent((w)=>
	{
		//ext.executeOnBackground('RegisterWindow', { window_id : w.id	});
	});

	document.getElementById('downloadButton').addEventListener('click',(evt)=>
	{
		let type = document.getElementById('report-type').value;

		let date1 = null;
		let date2 = null;

		let date1String = Utils.getById("date1").value;
		let date2String = Utils.getById("date2").value;

		if( date1String )
		{
			date1 = new Date( date1String );
		}

		if( date2String )
		{
			date2 = new Date( date2String );
		}

		switch( type )
		{
			case 'Basic Info'	:
			{
				persistence.getProductList( date1String, date2String )
				.then((products)=>
				{
					let s = persistence.generateRawReport( products );
					download('something.csv',s );
				})
				.catch((e)=>
				{
					console.log( e );
					Utils.alert('An error occorred');
				});
				break;
			}
			case 'products_without_stock':
			{
				//persistence.getProductList( date1, date2 ).then((products)=>
				//{
				//	//let s = persistence.generateProductsNoStock( products );
				//	let s = persistence.generateRawReport( products );
				//	download('something.csv',s);
				//})
				//.catch((e)=>
				//{
				//	console.log( e );
				//	Utils.alert('An error occorred');
				//});

				persistence.getUrlsReport()
				.then((allUrls)=> {
					let filename = 'Foooo.csv';
					let string = allUrls.reduce((p,c)=>{
						return p+(c.join('\t') )+'\n';
					},'');
					download( filename, string );
				});
				break;
			}
			case 'preferences_historic_stock':
			{
				persistence.getSettings()
				.then((settings)=>
				{
					return persistence.getStockList( date1, date2 ).then(( stockArray )=>
					{
						let date = new Date();
						let filename = 'Historic_stock_'+(date.toISOString().substring(0,10) )+'.csv';
						let s = persistence.getStockReport2( stockArray, settings.product_sellers_preferences );
						download( filename, s );
					});
				})
				.catch((e)=>
				{
					console.error( e );
				});
				break;
			}
			case 'historic_stock':
			{
				persistence.getStockList( date1, date2 ).then((stockArray)=>
				{
					let date = new Date();
					let filename = 'Historic_stock_'+(date.toISOString().substring(0,10) )+'.csv';
					let s = persistence.getStockReport2( stockArray );
					download( filename, s );
				})
				.catch((e)=>
				{
					console.error( e );
				});
				break;
			}
			case 'historic_price':
			{
				let s = persistence.generateHistoricPriceReport( products );
				let date = new Date();
				let filename= 'Historic_price_'+(date.toISOString().substring(0,10) )+'.csv';
				download(filename,s);
				break;
			}
		}
	});

	function download(filename, text)
	{
		console.log( 'Texst length ',text.length );
		var element = document.createElement('a');
		let downloadableText = encodeURIComponent( text );

		console.log( 'Texst length ',downloadableText.length );

		let href = persistence.getDownloadHref( text, 'data:text/csv' );//data:text/csv;charset=utf-8

		element.setAttribute('href', href );// +downloadableText );
		element.setAttribute('download', filename);
		element.style.display = 'none';

		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}
});
