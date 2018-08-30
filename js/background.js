
window.addEventListener("unhandledrejection", function(err, promise) {
    // handle error here, for example log
});



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


ext.addListener('UrlDetected',(url,request,tab_id)=>
{
	persistence.updateUrl( request ).then(()=>
	{
		ext.executeOnClients('SettingsArrive', settings );
	});
});

ext.addListener('SettingsChange',()=>
{
	persistence.getSettings().then((newSettings)=>
	{
		settings = newSettings;
	});
});

ext.addListener('OffersFound',(url,request,tab_id)=>
{
	try{
	if( Array.isArray( request ) && request.length  )
		persistence.addOffers( request );
	else
		console.log("not a valid request");
	}catch(e)
	{
		console.log( e );
	}

});

ext.addListener('StockFound',(url,request,tab_id)=>
{
	try{
	if( Array.isArray( request ) && request.length  )
		persistence.addStock( request );
	else
		console.log("not a valid request");
	}catch(e)
	{
		console.log( e );
	}
});

ext.addListener('ProductsFound',(url,request,tab_id)=>
{
	if( Array.isArray( request ) && request.length )
	{
		let offers = request.reduce((prev,product)=>
		{
			product.offers.forEach( i=> prev.push( i ) );
			return prev;
		});

		if( offers.length )
			persistence.addOffers( offers );

		console.log('products found', request );
		persistence.updateProductLists( request );
	}
});
