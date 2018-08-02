
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
					download('something.csv',s);
					break;
				}
				case 'history_prices':
				{
					let s = persistence.generateRawReport( products );
					download('something.csv',s);
					break;
				}
			}
		});
	});

	function download(filename, text)
	{
		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);
		element.style.display = 'none';

		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}
});
