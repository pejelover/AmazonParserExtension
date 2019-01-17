import Persistence from './Persistence.js';
import Server from './extension-framework/Server.js';
//import default_settings from './default_settings.js';

window.onerror = function(err){
    console.log(err); // logs all errors
};

var persistence	= new Persistence();
var settings	= {};

persistence.init()
.then(()=>
{
	return persistence.getSettings();
})
.then((sss)=>
{
	settings = sss;
})
.catch((e)=>
{
	console.error( e );
});

var ext			= new Server();

ext.addListener('RemoveAsinSeller',(url,request,tab_id, port )=>
{
	if( request.asin in settings.product_sellers_preferences )
	{
		let index = settings.product_sellers_preferences[ request.asin ].indexOf( request.seller_id );

		if( index !== -1 )
			settings.product_sellers_preferences[ request.asin ].splice( index, 1 );
	}
});

ext.addListener('AddUrls',(url,request,tab_id,port)=>
{
	if( Array.isArray( request ) && request.length  )
	{
		console.log('Urls Found', request.length );
		persistence.addUrls( request );
	}
});

ext.addListener('PageNotFound',(url,request,tab_id )=>
{
	let date = new Date();
	persistence.addNotFound({ asin: request.asin, url: url, time : date.toISOString() });
});

ext.addListener('UrlDetected',(url,request,tab_id, port )=>
{
	if( /\/gp\/huc\/view.html\?.*newItems=.*$/.test( url ) && settings.page_previous_cart.action === 'close_tab' )
	{
		chrome.tabs.remove( tab_id );
	}
	else
	{
		persistence.updateUrl( request ).then(()=>
		{
			ext.executeOnClients('SettingsArrive', settings, port );
		});
	}
});

ext.addListener('SettingsChange',()=>
{
	persistence.getSettings().then((newSettings)=>
	{
		settings = newSettings;
	});
});

ext.addListener('OffersFound',(url,request,tab_id, port)=>
{
	try{
	if( Array.isArray( request ) && request.length  )
	{
		persistence.addOffers( request );
	}
	else
		console.log("not a valid request");
	}catch(e)
	{
		console.log( e );
	}
});


ext.addListener('StockFound',(url,request,tab_id,port)=>
{
	try{
	if( Array.isArray( request ) && request.length  )
	{
		persistence.addStock( request );

		request.forEach((stock)=>
		{
			//if( stock.asin in settings.product_sellers_preferences )
			//{
			//	let sellers_ids = settings.product_sellers_preferences[ stock.asin ];

			//	let index = sellers_ids.indexOf( stock.seller_id );

			//	if( index !== -1 )
			//		settings.product_sellers_preferences[ stock.asin ].splice( index, 1 );
			//}
		});

		//console.log( request[0].qty );
	}
	else
		console.log("not a valid request");
	}catch(e)
	{
		console.log( e );
	}
});

ext.addListener('ParseAgainServer')

ext.addListener('OpenBackup',()=>{
	chrome.tabs.create({url: chrome.extension.getURL('backup.html')});
});


ext.addListener('ProductsFound',(url,request,tab_id, port )=>
{
	if( Array.isArray( request ) && request.length )
	{
		persistence.updateProductLists( request );
	}
});

chrome.commands.onCommand.addListener(function(command)
{
	//console.log('Comman received',command );
	if( command === "get_all_links" )
	{

		chrome.tabs.query({
			currentWindow: true
			, active : true
		},
	  	function(tabArray)
		{
			ext.executeOnClients('ExtractAllLinks',{});
		});
	}
});


