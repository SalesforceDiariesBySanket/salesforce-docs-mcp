# ============================================
# SALESFORCE DEVELOPER DOCUMENTATION PDF DOWNLOADER
# ============================================
# Downloads 440+ PDFs from developer.salesforce.com
# Sources: resources.docs.salesforce.com, static docs, cheatsheets, SDK docs
# 
# Expected Result: ~340 PDFs, ~1.5 GB
# ============================================

$ErrorActionPreference = "Continue"
$baseDir = Split-Path -Parent $PSScriptRoot
$pdfsDir = Join-Path $baseDir "docs\pdfs"

# Create directory if not exists
if (!(Test-Path $pdfsDir)) {
    New-Item -ItemType Directory -Path $pdfsDir -Force | Out-Null
}

# All verified PDF URLs from Salesforce documentation
$pdfUrls = @(
    # === LEGACY/RETIRED DOCS ===
    "https://developer.salesforce.com/resource/pdfs/Lightning_Components_Cheatsheet.pdf",
    "https://resources.docs.salesforce.com/136/latest/en-us/sfdc/pdf/ot.pdf",
    "https://resources.docs.salesforce.com/138/latest/en-us/sfdc/pdf/sforce_API.pdf",
    "https://resources.docs.salesforce.com/146/latest/en-us/sfdc/pdf/salesforce_axm_6.0_release_notes.pdf",
    "https://resources.docs.salesforce.com/172/latest/en-us/sfdc/pdf/api_apex_rest.pdf",
    "https://resources.docs.salesforce.com/174/latest/en-us/sfdc/pdf/dbcom_api_rest.pdf",
    "https://resources.docs.salesforce.com/176/latest/en-us/sfdc/pdf/dbcom_api_streaming.pdf",
    "https://resources.docs.salesforce.com/178/latest/en-us/sfdc/pdf/dbcom_apex_language_reference.pdf",
    "https://resources.docs.salesforce.com/178/latest/en-us/sfdc/pdf/dbcom_chatter_rest_api.pdf",
    "https://resources.docs.salesforce.com/184/latest/en-us/sfdc/pdf/dbcom_api_asynch.pdf",
    "https://resources.docs.salesforce.com/184/latest/en-us/sfdc/pdf/dbcom_api_meta.pdf",
    "https://resources.docs.salesforce.com/184/latest/en-us/sfdc/pdf/forcecom_workbook.pdf",
    "https://resources.docs.salesforce.com/184/latest/en-us/sfdc/pdf/integration_workbook.pdf",
    "https://resources.docs.salesforce.com/188/latest/en-us/sfdc/pdf/salesforce_cti_developer_guide.pdf",
    "https://resources.docs.salesforce.com/188/latest/en-us/sfdc/pdf/salesforce_cti_developer_guide_2.pdf",
    "https://resources.docs.salesforce.com/192/latest/en-us/sfdc/pdf/bi_dev_guide_eql.pdf",
    "https://resources.docs.salesforce.com/192/latest/en-us/sfdc/pdf/salesforce_studio_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/record_locking_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/salesforce1_guide_admin.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/salesforce_appexchange_install_guide.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/salesforce_jigsaw_clean_user_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/salesforce_profile_tabs_styleguide.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/salesforce_query_search_optimization_developer_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/service_communities_guide.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/wb_siteforce.pdf",
    "https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/workbook_database.pdf",
    "https://resources.docs.salesforce.com/196/latest/en-us/sfdc/pdf/salesforce1_api_guide.pdf",
    "https://resources.docs.salesforce.com/196/latest/en-us/sfdc/pdf/salesforce_supported_browsers_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/198/latest/en-us/sfdc/pdf/apex_workbook.pdf",
    "https://resources.docs.salesforce.com/198/latest/en-us/sfdc/pdf/isv_pkg.pdf",
    "https://resources.docs.salesforce.com/198/latest/en-us/sfdc/pdf/lex_considerations.pdf",
    "https://resources.docs.salesforce.com/198/latest/en-us/sfdc/pdf/salesforce_knowledge_import_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/198/latest/en-us/sfdc/pdf/salesforce_knowledge_setup_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/198/latest/en-us/sfdc/pdf/salesforce_pagelayouts_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/198/latest/en-us/sfdc/pdf/service_dev.pdf",
    "https://resources.docs.salesforce.com/200/latest/en-us/sfdc/pdf/salesforce_approvals_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/200/latest/en-us/sfdc/pdf/salesforce_email_approval_faq.pdf",
    "https://resources.docs.salesforce.com/200/latest/en-us/sfdc/pdf/salesforce_filtered_lookups_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/200/latest/en-us/sfdc/pdf/salesforce_web_integration_links.pdf",
    "https://resources.docs.salesforce.com/200/latest/en-us/sfdc/pdf/salesforce_workflow_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/202/latest/en-us/sfdc/pdf/salesforce_importpersonal_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/202/latest/en-us/sfdc/pdf/salesforce_recordtypes_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/202/latest/en-us/sfdc/pdf/salesforce_workbench_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/204/latest/en-us/sfdc/pdf/data_pipelines.pdf",
    "https://resources.docs.salesforce.com/206/latest/en-us/sfdc/pdf/salesforce_territories_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/206/latest/en-us/sfdc/pdf/tm_decision_guide.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/sales_admins.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/sales_users.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/support_admins.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/support_agents.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/workbook_analytics.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/workbook_flow.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/workbook_security.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/workbook_service_cloud.pdf",
    "https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/workbook_vf.pdf",
    "https://resources.docs.salesforce.com/210/latest/en-us/sfdc/pdf/limits_limitations.pdf",
    "https://resources.docs.salesforce.com/210/latest/en-us/sfdc/pdf/salesforce_platform_mobile_services.pdf",
    "https://resources.docs.salesforce.com/210/latest/en-us/sfdc/pdf/sf.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_axm_blackberry_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_axm_user_guide_for_blackberry.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_cti_admin_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_cti_demo_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_cti_enduser_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_field_service_lightning_managed_package.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_mobile_implementation.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_mobile_user_guide_android.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_mobile_user_guide_for_iphone.pdf",
    "https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/sfdx_ide2.pdf",
    "https://resources.docs.salesforce.com/214/latest/en-us/sfdc/pdf/salesforce_communities_implementation.pdf",
    "https://resources.docs.salesforce.com/214/latest/en-us/sfdc/pdf/salesforce_pubs_style_guide.pdf",
    "https://resources.docs.salesforce.com/214/latest/en-us/sfdc/pdf/salesforce_territories_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/216/latest/en-us/sfdc/pdf/pardot_get_start.pdf",
    "https://resources.docs.salesforce.com/216/latest/en-us/sfdc/pdf/salesforce_report_builder_impl_guide.pdf",
    "https://resources.docs.salesforce.com/218/latest/en-us/sfdc/pdf/salesforce_jigsaw_config.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/bi_admin_guide_data_integration_guide.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/live_agent_administrator.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/live_agent_dev_guide.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/live_agent_rest.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/live_agent_support_agents.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/live_agent_support_supervisors.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/salesforce1_admin_guide.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/salesforce_jigsaw_clean_admin_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/salesforce_jigsaw_jfs_uninstall.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/salesforce_vpm_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/snapins.pdf",
    "https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/snapins_web_dev_guide.pdf",

    # === BUDDY MEDIA DOCS ===
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaAnalytics.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaChannelAdminGuide.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaConversationBuddy.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaDataAdapter.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaDataAdaptorDeveloperGuide.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaFacebookGlobalPages.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaGettingStarted.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaImplementationGuide.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaProfileBuddy.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaReachBuddy.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaYouTubeBrandChannels.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/BuddyMediaYouTubeOneChannelFAQ.pdf",
    "https://resources.docs.salesforce.com/rel1/buddymedia/en-us/static/pdf/MarketingCloudBuddyMediaImplementationGuide.pdf",

    # === CHEATSHEETS AND STATIC DOCS ===
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/CheckoutUserGuide.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Apex_Code_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_CRM_Lightning_Experience_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_CRM_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Custom_Metadata_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Formulas_Developer_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Git_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_LightningComponents_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Process_Automation_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Query_Search_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Record-Locking-Cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Reports_and_Dashboards_Rest_API_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Rest_API_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_S1-Admin_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_S1-Developer_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Security_Admin_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Security_Developer_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Service_Cloud_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Soap_API_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SF_Visualforce_Developer_cheatsheet_web.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK1_AbandonedCart.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK2_CouponRedemption.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK3_OrderonBehalfof.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK4_PersonalizedMarketingRecommendations.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK5_TransactionalEmails.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK6_CancelOrders.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK7_ConversationalCommerce.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK8_SeamlessIdentity.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/SK9_CrossCloudEngagementDataModels.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/chatter-edition-help.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/chatter-external.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/chatter-help.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/ext-svc-overview.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/field_service_lightning_guide.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/identity_connect_impl_guide.pdf",
    "https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/salesforce_query_search_optimization_developer_cheatsheet.pdf",

    # === RADIAN6 DOCS ===
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/MarketingCloudRadian6Introduction.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6AnalysisDashboard.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6EngagementConsole.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6EngagementConsoleSpecifications.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6FacebookManagedAccounts.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6Insights.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6Mobile.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6Reports.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6SummaryDashboard.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6SuperUsers.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6TopicProfile.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6TopicProfileOptimization.pdf",
    "https://resources.docs.salesforce.com/rel1/radian6/en-us/static/pdf/Radian6TwitterManagedAccounts.pdf",

    # === MARKETING CLOUD DOCS ===
    "https://resources.docs.salesforce.com/rel1/other/en-us/static/pdf/InsightsPartnerOverviews.pdf",
    "https://resources.docs.salesforce.com/rel1/other/en-us/static/pdf/MCNov13ReleaseNotes.pdf",
    "https://resources.docs.salesforce.com/rel1/other/en-us/static/pdf/MCReleaseNotesSpring14.pdf",
    "https://resources.docs.salesforce.com/rel1/other/en-us/static/pdf/MC_ReleaseNotes_August13.pdf",
    "https://resources.docs.salesforce.com/rel1/other/en-us/static/pdf/StreamActivityFAQ.pdf",

    # === SERVICE SDK DOCS ===
    "https://resources.docs.salesforce.com/servicesdk/0/4/en-us/pdf/service_sdk_android.pdf",
    "https://resources.docs.salesforce.com/servicesdk/1/2/en-us/pdf/service_sdk_ios.pdf",
    "https://resources.docs.salesforce.com/servicesdk/2/0/en-us/pdf/service_sdk_ios.pdf",
    "https://resources.docs.salesforce.com/servicesdk/206/0/en-us/pdf/service_sdk_android.pdf",
    "https://resources.docs.salesforce.com/servicesdk/208/0/en-us/pdf/service_sdk_ios.pdf",
    "https://resources.docs.salesforce.com/servicesdk/208/0/en-us/pdf/service_sdk_android.pdf",
    "https://resources.docs.salesforce.com/servicesdk/210/0/en-us/pdf/service_sdk_ios.pdf",
    "https://resources.docs.salesforce.com/servicesdk/210/0/en-us/pdf/service_sdk_android.pdf",
    "https://resources.docs.salesforce.com/servicesdk/214/0/en-us/pdf/service_sdk_android.pdf",
    "https://resources.docs.salesforce.com/servicesdk/214/0/en-us/pdf/service_sdk_ios.pdf",
    "https://resources.docs.salesforce.com/servicesdk/218/0/en-us/pdf/service_sdk_ios.pdf",
    "https://resources.docs.salesforce.com/servicesdk/218/0/en-us/pdf/service_sdk_android.pdf",
    "https://resources.docs.salesforce.com/servicesdk/220/0/en-us/pdf/service_sdk_android.pdf",
    "https://resources.docs.salesforce.com/servicesdk/220/0/en-us/pdf/service_sdk_ios.pdf",
    "https://resources.docs.salesforce.com/servicesdk/222/0/en-us/pdf/service_sdk_android.pdf",
    "https://resources.docs.salesforce.com/servicesdk/222/0/en-us/pdf/service_sdk_ios.pdf",

    # === CURRENT DEVELOPER DOCS (Latest) ===
    "https://resources.docs.salesforce.com/sfdc/pdf/apex_ajax.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/apex_api.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api_action.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api_asynch.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api_bulk_v2.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api_console.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api_meta.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api_rest.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api_streaming.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api_tooling.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/api.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/appexchange_install_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/appexchange_publishing_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/apps.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/async_soql_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/basics.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_admin_guide_security.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_admin_guide_setup.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_bindings.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_ext_data.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_ext_data_format.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_json.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_rest.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_saql.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_sdk.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_wave_templates.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/bi_dev_guide_xmd.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/big_objects_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/canvas_framework.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/case_feed_dev_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/chatter.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/collaboration.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/communities_users_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/community_dev.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/connect_rest_api.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/console_component_developer_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/cpq_dev_api.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/custom_metadata_types_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/data_dot_com_clean_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/datacom_salesforce_record_matching.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/datadotcom_api_dev_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/deploy_sandboxes.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/draes.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/eclipse.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/einstein_platform_services.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/extend_click.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/extend_code.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/federated_search.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/field_history_retention.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/financial_services.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/forecasts.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/formula_date_time_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/fsc_dev_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/generate_orders_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/health_cloud_dev_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/healthcare.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/integration_patterns_and_practices.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/jsapi_chatteranswers.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/lex.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/lightning.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/lightning_adoption_javascript_button_conversion.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/lightning_experience_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/lightning_knowledge_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/mobile_sdk.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/object_reference.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/oem_user_license_comparison_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/omnichannel_supervisor.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/organization_sync.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/platform_events.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/sales_einstein_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce1_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce1_mobile_security.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce1_url_schemes.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce1_user_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_B2C_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_HTMLtemplates_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_TEadmin_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_TEuser_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_agent_console_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_analytics_folder_sharing_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_analytics_overview_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_analytics_rest_api.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_answers_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_apex_language_reference.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_app_limits_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_assets_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_busprocess_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_campaign_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_campaigns_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_case_feed_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_case_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_case_interaction_setup_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_chatter_rest_api.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_chatterplus_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_client_autoupdate_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_communities_managers_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_community_identity_templates.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_conflict_res_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_console_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_content_delivery_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_content_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_convertleads_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_creating_on_demand_apps.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_customer_portal_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_dashboard_filters_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_dashboard_samples.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_dashboards_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_data_import_wizard_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_data_loader.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_data_quality_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_data_quality_duplicate_prevention.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_defer_sharing_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_developer_environment_dotnet_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_developer_environment_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_development_lifecycle.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_divisions_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_dynamic_dashboards_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_ee_upgrade_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_entitlements_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_exchange_sync_admin_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_exchange_sync_user.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_external_identity_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_field_names_reference.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_file_sync_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_files_connect_implementation.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_finserv_admin_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_finserv_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_finserv_install_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_finserv_quick_start.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_finserv_upgrade_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_flash_builder.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_flash_builder_quickstart.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_forecastFAQ_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_forecastsetup_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_forecastuser_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_formula_size_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_formulas_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_groupcal_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_guided_engagement.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_health_cloud_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_ideas_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_ideas_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_ideas_theme_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_identity_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_implementing_territory_mgmt2_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_import_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_knowledge_dev_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_knowledge_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_large_data_volumes_bp.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_lead_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_leads_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_limits_practices.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_lma_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_mailmerge.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_mailmerge_upload_guidelines.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_massdelete_undoimport.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_migration_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_mobile_push_notifications_implementation.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_office_edition_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_office_release_notes.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_offline_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_offline_release_notes.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_opportunity_trending_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_orders_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_packaging_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_pages_developers_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_partner_portal_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_placeorder_rest_api.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_platform_encryption_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_platform_encryption_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_platform_glossary.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_platform_portal_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_portal_to_community_migration_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_products_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_profile_tabs_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_questions_portal_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_record_access_under_the_hood.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_relgroups_getstart.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_report_cross_filters_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_report_joined_format_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_report_summary_functions_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_reportperformance_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_reports_bucketing_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_reports_enhanced_reports_tab_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_reports_schedule_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_salesrep_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_security_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_selfservice_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_selfservice_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_sfo_release_notes.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_sharing_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_sharing_users_tipsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_single_sign_on.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_solutions_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_solutions_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_soql_sosl.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_supportadmin_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_supportrep_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_technical_requirements.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_useful_approval_processes.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_useful_formula_fields.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_useful_validation_formulas.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_useful_workflow_rules.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_using_multiple_currencies.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_views_cheatsheet.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_visualforce_best_practices.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_voice_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/salesforce_wm_peripherals_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/secure_coding.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/security_certificate_changes.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/service_presence_administrators.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/service_presence_developer_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/setup.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/sfdx_cli_reference.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/sfdx_dev.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/sfdx_setup.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/sfo_getting_started_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/sharing_architecture.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/smb_sales_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/smb_sales_impl_guide_2.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/social_customer_service_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/sos_administrators.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/state_country_picklists_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/support.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/team_selling_implementation_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/utility_bar_impl_guide.pdf",
    "https://resources.docs.salesforce.com/sfdc/pdf/workcom_implementation_guide.pdf"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SALESFORCE DEVELOPER DOCS PDF DOWNLOADER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Total URLs: $($pdfUrls.Count)" -ForegroundColor Yellow
Write-Host "Target Dir: $pdfsDir" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$downloaded = 0
$skipped = 0
$failed = 0
$totalSize = 0

for ($i = 0; $i -lt $pdfUrls.Count; $i++) {
    $url = $pdfUrls[$i]
    $fileName = $url.Split("/")[-1]
    
    # Handle duplicate filenames by adding source prefix
    $urlParts = $url -split "/"
    if ($url -match "servicesdk/(\d+)/") {
        $version = $Matches[1]
        $fileName = "servicesdk_${version}_$fileName"
    } elseif ($url -match "rel1/buddymedia") {
        $fileName = "buddymedia_$fileName"
    } elseif ($url -match "rel1/radian6") {
        $fileName = "radian6_$fileName"
    } elseif ($url -match "rel1/other") {
        $fileName = "other_$fileName"
    } elseif ($url -match "rel1/doc") {
        $fileName = "static_$fileName"
    }
    
    $pdfPath = Join-Path $pdfsDir $fileName
    $progress = [math]::Round((($i + 1) / $pdfUrls.Count) * 100, 1)
    
    Write-Host "[$($i+1)/$($pdfUrls.Count)] ($progress%) " -NoNewline
    
    if (Test-Path $pdfPath) {
        $size = [math]::Round((Get-Item $pdfPath).Length / 1MB, 2)
        $totalSize += $size
        Write-Host "EXISTS: $fileName ($size MB)" -ForegroundColor Cyan
        $skipped++
        continue
    }
    
    Write-Host "Downloading: $fileName... " -NoNewline
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $pdfPath -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop
        
        if ((Test-Path $pdfPath) -and ((Get-Item $pdfPath).Length -gt 1000)) {
            $size = [math]::Round((Get-Item $pdfPath).Length / 1MB, 2)
            $totalSize += $size
            Write-Host "OK ($size MB)" -ForegroundColor Green
            $downloaded++
        } else {
            Write-Host "FAILED (empty)" -ForegroundColor Red
            if (Test-Path $pdfPath) { Remove-Item $pdfPath -Force }
            $failed++
        }
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        if (Test-Path $pdfPath) { Remove-Item $pdfPath -Force }
        $failed++
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "DOWNLOAD COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Downloaded: $downloaded new files" -ForegroundColor Green
Write-Host "Skipped:    $skipped (already exist)" -ForegroundColor Cyan
Write-Host "Failed:     $failed" -ForegroundColor $(if ($failed -gt 0) { "Yellow" } else { "Green" })
Write-Host "Total Size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Yellow

$finalCount = (Get-ChildItem $pdfsDir -Filter "*.pdf" -ErrorAction SilentlyContinue).Count
$finalSize = [math]::Round((Get-ChildItem $pdfsDir -Filter "*.pdf" | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Host ""
Write-Host "Final PDF Count: $finalCount files ($finalSize MB)" -ForegroundColor Magenta
