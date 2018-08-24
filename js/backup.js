document.addEventListener('DOMContentLoaded', function()
{
	//var ext = new Client();
	let persistence = new Persistence();

	persistence.init().then(()=>
	{
		return persistence.getProductList( null, null );
	})
	.then(( products )=>
	{
		let href = persistence.getDownloadHref( products );
		let date = new Date();
		let anchor= Utils.getById("backupLink");

		anchor.setAttribute('download', 'backup'+date.toISOString()+'.json');
		anchor.setAttribute('href', href );
		anchor.textContent = date.toISOString();
	})
	.catch((e)=>
	{
		console.log( e );

		let element = document.createElement('div');
		element.textContent = 'Error '+e.msg;
		document.body.append( element );
	});


	let importButton = Utils.getById('importButton');
	importButton.addEventListener('click',(evt)=>
	{
		var file = document.getElementById("inputFile").files[0];

	    var reader = new FileReader();
	    reader.readAsText(file, "UTF-8");
	    reader.onload = function (evt) {
	        //document.getElementById("fileContents").innerHTML = evt.target.result;
			try
			{
				let products = JSON.parse( evt.target.result );
				let generator = (item, index)=>
				{
					if( 'asin' in item )
					{
						return persistence.updateProduct( item );
					}
					else
					{
						return Promise.resolve( true );
					}
				};

				PromiseUtils.runSequential( products, generator );
			}
			catch(e)
			{
				console.log( e );
			}
	    };

	    reader.onerror = function (evt) {
			console.log( evt.target.result );
	        document.getElementById("fileContents").innerHTML = "error reading file";
	    };
	});
});

