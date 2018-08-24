

document.addEventListener('DOMContentLoaded', function()
{
	var persistence = new Persistence();
	persistence.init();

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

		let date1String = '';//Utils.getById("date1").value;
		let date2String = '';//Utils.getById("date2").value;

		//if( date1String )
		//{
		//	date1 = new Date( date1String );
		//	date1.setMinutes( date1.getMinutes()-date1.getTimezoneOffset() );
		//	date1String = date1.toISOString();
		//}

		//if( date2String )
		//{
		//	date2 = new Date( date2String );
		//	date2.setMinutes( date2.getMinutes() - date2.getTimezoneOffset() );
		//	date2String = date2.toISOString();
		//}


		persistence.getProductList( date1, date2 ).then((products)=>
		{
			console.log('All products',products.length );

			switch( type )
			{
				case 'Basic Info'	:
				{
					let s = persistence.generateRawReport( products );
					download('something.csv',s );
					break;
				}
				case 'products_without_stock':
				{
					//let s = persistence.generateProductsNoStock( products );
					let s = persistence.generateRawReport( products );
					download('something.csv',s);
					break;
				}
				case 'historic_stock':
				{
					let s = persistence.generateHistoricReportByDays( products );//generateHistoricStockReport( products, date1String, date2String );
					let date = new Date();
					let filename = 'Historic_stock_'+(date.toISOString().substring(0,10) )+'.csv';
					download(filename,s);
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
				case 'backup':
				{
					let s = persistence.getStockReport2( products );
					download('hello.csv', s );
				}
			}
		});
	});

	function download(filename, text)
	{
		console.log( 'Texst length ',text.length );
		var element = document.createElement('a');
		let downloadableText = encodeURIComponent( text );

		console.log( 'Texst length ',downloadableText.length );

		element.setAttribute('href', 'data:text/csv;charset=utf-8,' +downloadableText );
		element.setAttribute('download', filename);
		element.style.display = 'none';

		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}
});
