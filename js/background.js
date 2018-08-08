
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

ext.addListener('ProductsFound',(url,request,tab_id)=>
{
	console.log('products found', request );
	persistence.updateProductLists( request );
});
