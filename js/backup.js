document.addEventListener('DOMContentLoaded', function()
{
	//var ext = new Client();
	let persistence = new Persistence();

	Utils.getById('optimize').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		persistence.optimizeAllStock().then(()=>
		{
			console.log('Ends');
			Utils.alert('Optimization Ends');
		});
	});

	Utils.getById('backupGenerateBackupFile').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );

		let type = Utils.getById('backupType').value;

		switch( type )
		{
			case 'Products':
			{

				let start = '0040423131';

				return persistence.getAllIncremental('products',{ '>=': start },'asin')
				.then((productList)=>
				{
					let href = persistence.getDownloadHref({ products: productList ,stock:[] ,offers: [] });
					let date = new Date();
					Utils.getById('backupStatus').innerHTML = '';

					let anchor = window.document.createElement('a');
					anchor.setAttribute('download', 'PRODUCTS_backup_'+date.toISOString()+'.json');
					anchor.setAttribute('href', href );
					anchor.textContent = 'Backup_Products'+date.toISOString();
					anchor.classList.add('button');

					Utils.getById('backupStatus').append( anchor );

					return persistence.getStockList( null, null );
				})
				.catch((e)=>
				{
					console.log( e );
					Utils.alert('An error occurred please check logs');
				});
			}
			case 'Offers':
			{
				persistence.getOffersCount( null, null ).then((offersCount)=>
				{
					let start 	= 1;
					let count	= offersCount/100000;

					if( count !== Math.floor( count ) )
						count = Math.floor( count )+1;

					let times =new Array( count );
					times.fill(0);
					let allRecords = [];

					let generator = ()=>
					{
						return persistence.getOffersByOptions({'>=':start, 'count' : 100000 }).then((all)=>
						{
							start = all[ all.length-1 ].id;
							allRecords.push( ...all );
							return Promise.resolve( 1 );
						});
					};

					return PromiseUtils.runSequential( times, generator ).then(()=>
					{
						return Promise.resolve( 1 );
					})
					.then(()=>
					{
						let href = persistence.getDownloadHref({ products: [], stock: [] , offers: allRecords });
						Utils.getById('backupStatus').innerHTML = '';

						let date = new Date();
						let anchor = window.document.createElement('a');
						anchor.setAttribute('download', 'OFFERS_backup'+date.toISOString()+'.json');
						anchor.setAttribute('href', href );
						anchor.textContent = 'Backup_Offers'+date.toISOString();
						anchor.classList.add('button');

						Utils.getById('backupStatus').append( anchor );
					});
				})
				.catch((e)=>
				{
					console.log( e );
					Utils.alert('An error occourred please check the logs');
				});

				break;
			}
			case 'Stock':
			{
				return persistence.getStockList( null, null ).then((stock)=>
				{
						let href = persistence.getDownloadHref({ products: [], stock: stock, offers: []});
						Utils.getById('backupStatus').innerHTML = '';
						let date = new Date();


						let anchor = window.document.createElement('a');
						anchor.setAttribute('download', 'STOCK_backup_'+date.toISOString()+'.json');
						anchor.setAttribute('href', href );
						anchor.textContent = 'Backup_Stock'+date.toISOString();
						anchor.classList.add('button');
						Utils.getById('backupStatus').append( anchor );
				})
				.catch((e)=>
				{
					Utils.alert('An error occurred please try again later');
				});
			}
		}
	});

	persistence.init().then(()=>
	{
		let productPromise = PromiseUtils.resolveAfter(1, 15000 )
		.then(()=>
		{
			return persistence.getProductList( null, null ).then((productList)=>
			{
				let href = persistence.getDownloadHref({ products: productList ,stock:[] ,offers: [] });

				let date = new Date();
				let anchor= Utils.getById("backupProducts");
				anchor.setAttribute('download', 'PRODUCTS_backup_'+date.toISOString()+'.json');
				anchor.setAttribute('href', href );
				anchor.textContent = 'Backup_Products'+date.toISOString();

				return persistence.getStockList( null, null );
			});
		})
		.then(( stock )=>
		{
			let href = persistence.getDownloadHref({ products: [], stock: stock, offers: []});

			let date = new Date();
			let anchor= Utils.getById("backupStock");
			anchor.setAttribute('download', 'STOCK_backup_'+date.toISOString()+'.json');
			anchor.setAttribute('href', href );
			anchor.textContent = 'Backup_Stock'+date.toISOString();

			return persistence.getOffersCount( null, null );
		})
		.then(( offers )=>{

			console.log('It has offers ', offers );

			let start 	= 1;
			let count	= offers/100000;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let times =new Array( count );
			times.fill(0);
			let allRecords = [];

			let generator = ()=>
			{
				return persistence.getOffersByOptions({'>=':start, 'count' : 100000 }).then((all)=>
				{
					start = all[ all.length-1 ].id;
					allRecords.push( ...all );
					return Promise.resolve( 1 );
				});
			};

			return PromiseUtils.runSequential( times, generator ).then(()=>
			{
				return allRecords;
			});
		})
		.then((allRecords)=>
		{
			let href = persistence.getDownloadHref({ products: [], stock: [] , offers: allRecords });
			let date = new Date();
			let anchor= Utils.getById("backupOffers");
			anchor.setAttribute('download', 'OFFERS_backup'+date.toISOString()+'.json');
			anchor.setAttribute('href', href );
			anchor.textContent = 'Backup_Offers'+date.toISOString();
			//return persistence.getOffers( null, null );
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
			var file	= document.getElementById("inputFile").files[0];
		    var reader	= new FileReader();
		    reader.readAsText(file, "UTF-8");
		    reader.onload = function (evt) {
		        //document.getElementById("fileContents").innerHTML = evt.target.result;
				try
				{
					let obj= JSON.parse( evt.target.result );

					console.log('Try to save',obj.stock.length);

					return persistence.saveProductLists( obj.products ).then(()=>
					{
						return persistence.addStock( obj.stock );
					})
					.then(()=>
					{
						return persistence.addOffers( obj.offers );
					})
					.then((result)=>
					{
						console.log('It Finish',obj.stock.length);
						return result;
					})
					.catch((e)=>
					{
						console.log( e );
					});
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
});

