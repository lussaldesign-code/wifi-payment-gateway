{include file="sections/header.tpl"}

<form class="form-horizontal" method="post" role="form" action="{$_url}paymentgateway/diconnect">
    <div class="row">
        <div class="col-sm-12 col-md-12">
            <div class="panel panel-primary panel-hovered panel-stacked mb30">
                <div class="panel-heading">Diconnect Gateway</div>
                <div class="panel-body">
                    <div class="form-group">
                        <label class="col-md-2 control-label">Diconnect API URL</label>
                        <div class="col-md-6">
                            <input type="url" class="form-control" name="diconnect_api_url" value="{$_c['diconnect_api_url']}" placeholder="https://xxxxx.supabase.co/functions/v1">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="col-md-2 control-label">Integration Token</label>
                        <div class="col-md-6">
                            <input type="password" class="form-control" name="diconnect_api_token" value="{$_c['diconnect_api_token']}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="col-md-2 control-label">Callback Secret</label>
                        <div class="col-md-6">
                            <input type="password" class="form-control" name="diconnect_callback_secret" value="{$_c['diconnect_callback_secret']}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="col-md-2 control-label">Notification URL</label>
                        <div class="col-md-6">
                            <input type="text" readonly class="form-control" onclick="this.select()" value="{$_url}callback/diconnect">
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="col-lg-offset-2 col-lg-10">
                            <button class="btn btn-primary waves-effect waves-light" type="submit">Save Change</button>
                        </div>
                    </div>
                    <div class="alert alert-info">
                        Diconnect menangani Tripay/QRIS. PHPNuxBill hanya menyimpan invoice, menerima callback bertanda tangan, lalu menjalankan Package::rechargeUser().
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>

{include file="sections/footer.tpl"}
