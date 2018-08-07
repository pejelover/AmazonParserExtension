
document.addEventListener('DOMContentLoaded', function()
{
	//var ext = new Client();
	let persistence = new Persistence();

	chrome.windows.getCurrent((w)=>
	{
		//ext.executeOnBackground('RegisterWindow', { window_id : w.id	});
	});

	document.getElementById('downloadButton').addEventListener('click',(evt)=>
	{
		let type = document.getElementById('report-type').value;

		persistence.getProductList().then((products)=>
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
					let s = persistence.generateHistoricStockReport( products );
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
