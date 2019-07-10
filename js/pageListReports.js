import Persistence from './Persistence.js';
import Utils from './Diabetes/Util.js';
import default_settings from './default_settings.js';
import Client from './extension-framework/Client.js';


document.addEventListener('DOMContentLoaded', function()
{
	let persistence = new Persistence();
	persistence.init();

	Utils.getById('downloadButton').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		let type = Utils.getById('report-type').value;
		if( type == 'links' || type == 'open_links')
		{
			let asinList = Utils.getById('asinList').value.split(/\n/);
			let asinDictionary = {};

			asinList.forEach((words)=>
			{
				let tokens = words.split(/\t/);
				if( tokens.length !== 2 )
					return;

				let asin =tokens[0].trim();

				if( !(asin in asinDictionary ) )
				{
					asinDictionary[ asin ] = [];
				}

				let t1 = tokens[1].trim();

				if( t1 && !asinDictionary[ asin ].some( i => i==t1 ) )
				{
					asinDictionary[ asin ].push( t1 );
				}
			});

			persistence.getUrlsByAsinReport( asinDictionary ).then(( result )=>
			{

				if( type == 'links' )
				{
					let date	= new Date();
					let string	= result.reduce((p,c)=>{ return p+(c.join('\t') )+'\n'; },'');
					let dateStr	= date.toISOString().substring(0,19).replace(/\D/g,'');
					download('urlsByAsin_'+dateStr+'.csv', string );
				}
				else
				{
					let links = result.slice(1).map( i=>i[2] );

					if( links.length > 0 )
					{
						chrome.windows.getCurrent( {},(window_info)=>
						{
							chrome.runtime.sendMessage( default_settings.tab_extension_id ,{ open: links, window_id: window_info.id }, (response)=> { console.log( response);});
						});
					}
				}
			})
			.catch((err)=>
			{
				console.log("Error something happen",err);
			});
		}
		else if( type === 'allAsinBySeller' )
		{
			let seller_id = Utils.getById('asinList').value.trim();
			persistence.getAllAsinForSeller(seller_id ).then(( asins )=>
			{
				let asinDictionary = {};

				asins.forEach((asin)=>
				{
					asinDictionary[ asin ] = [ seller_id ];
				});

				persistence.getUrlsByAsinReport( asinDictionary ).then(( result )=>
				{
					let string = result.reduce((p,c)=>{
							return p+(c.join('\t') )+'\n';
					},'');

					var date = new Date();

					var dateStr = date.toISOString().substring(0,19).replace(/\D/g,'');

					download('urls_'+seller_id+'_'+dateStr+'.csv', string );
				});
			});
		}
		else
		{
			let asins = Utils.getById('asinList').value.trim().split('\n');

			persistence.getProductListByAsins( asins )
			.then((products)=>
			{
				let date		= new Date();
				var dateStr		= date.toISOString().substring(0,19).replace(/\D/g,'');
				let filename	= 'Products_'+dateStr+'.csv';
				let s = persistence.generateRawReport( products );
				download( filename ,s );
			})
			.catch((e)=>
			{
				console.log( e );
				Utils.alert('An error occorred');
			});
		}
	});

	function download(filename, text)
	{
		console.log( 'Texst length ',text.length );
		var element = document.createElement('a');


		let href = persistence.getDownloadHref( text, 'data:text/csv' );//data:text/csv;charset=utf-8

		element.setAttribute('href', href );
		element.setAttribute('download', filename);
		element.style.display = 'none';

		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}
});
