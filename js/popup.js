
import Persistence from './Persistence.js';
import Utils from './Diabetes/Util.js';
import Client from './extension-framework/Client.js';

document.addEventListener('DOMContentLoaded', function()
{
	var client = new Client();
	var persistence = new Persistence();
	persistence.init();

	let date = new Date();

	let f = (d)=>{
		return d < 10 ? "0"+d: d;
	};

	Utils.getById('date1').value = date.getFullYear()+"-"+f( date.getMonth()+1 )+"-"+f( date.getDate() );

	//Utils.getById("date2").value = date1.toISOString();
	//var ext = new Client();

	//chrome.windows.getCurrent((w)=>
	//{
	//	//ext.executeOnBackground('RegisterWindow', { window_id : w.id	});
	//});

	//document.getElementById('parseAgain').addEventListener('click',(evt)=>
	//{
	//	client.executeOnClients('ParseAgain',{});
	//});

	//document.getElementById('extractLinks').addEventListener('click',(evt)=>
	//{
	//	client.executeOnClients('ExtractAllLinks',{});
	//});

	Utils.getById('downloadButton').addEventListener('click',(evt)=>
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

					let date	= new Date();
					var dateStr = date.toISOString().substring(0,19).replace(/\D/g,'');
					let filename = 'Products_'+dateStr+'.csv';

					let s = persistence.generateRawReport( products );
					download( filename ,s );
				})
				.catch((e)=>
				{
					console.log( e );
					Utils.alert('An error occorred');
				});
				break;
			}
			case 'links':
			{
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

				persistence.getUrlsReport( date1, date2 )
				.then((allUrls)=> {
					let date	= new Date();
					var dateStr = date.toISOString().substring(0,19).replace(/\D/g,'');

					let filename = 'Links_'+dateStr+'.csv';

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

						var dateStr = date.toISOString().substring(0,19).replace(/\D/g,'');
						let filename = 'Historic_stock_'+dateStr+'.csv';
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
					var dateStr = date.toISOString().substring(0,19).replace(/\D/g,'');

					let filename = 'Historic_stock_'+( dateStr )+'.csv';
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

				persistence.getAllRangePrices({index: 'time','>=':date1.toISOString()}).then((array)=>
				{
					let s  = persistence.getPriceReport( array  );//.then((result)=>
					let date = new Date();
					let filename= 'Historic_price_'+(date.toISOString().substring(0,10) )+'.csv';
					download(filename, s );
				}).catch((e)=>console.log("ERROR on prices "+e.toString(),e ));
				break;
			}
			case 'urls_added':
				persistence.getAllIncremental( 'urls',{ index: 'time', '>=' : Utils.getById("date1").value }).then(( urls_array )=>
				{
					let result = '';
					urls_array.forEach((a)=>{
						result += a.asin+'\t'+a.friendly_ceo+'\t'+a.time+'\n';
					});

					let date = new Date();
					let filename= 'Urls_'+(date.toISOString().substring(0,10) )+'.csv';
					download(filename, result );
				});
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
