

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
	persistence.updateUrl( request ).then(()=>
	{
		ext.executeOnClients('SettingsArrive', settings, port );
	});
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
			if( stock.asin in settings.product_sellers_preferences )
			{
				let sellers_ids = settings.product_sellers_preferences[ stock.asin ];

				let index = sellers_ids.indexOf( stock.seller_id );

				if( index !== -1 )
					settings.product_sellers_preferences[ stock.asin ].splice( index, 1 );
			}
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

ext.addListener('OpenBackup',()=>{
	chrome.tabs.create({url: chrome.extension.getURL('backup.html')});
});


ext.addListener('ProductsFound',(url,request,tab_id, port )=>
{
	if( Array.isArray( request ) && request.length )
	{
		//let offers = request.reduce((prev,product)=>
		//{
		//	product.offers.forEach( i=> prev.push( i ) );
		//	return prev;
		//});

		//if( offers.length )
		//	persistence.addOffers( offers );

		//console.log('products found', request );
		persistence.updateProductLists( request );
	}
});
