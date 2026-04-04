import pandas as pd
import sqlite3
import joblib  # Modelleri kaydetme kütüphanesi
import os      # Klasör oluşturmak için
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# --- Algoritmaları ve Metrikleri İçe Aktarma ---
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix

# Veritabani yolu
db_file_path = 'database/HeartFailure_DB.db'

try:
    # 2. Veritabani bağlantisi
    conn = sqlite3.connect(db_file_path)
    print("Veritabanina başariyla bağlanildi.")

    # 3. Verileri getirme
    sql_query = "SELECT * FROM heart_failure_records" 
    df_from_db = pd.read_sql(sql_query, conn)
    print("Veriler başariyla getirildi!\n")
    
    # --- Eksik Veri Kontrolü ---
    df_from_db = df_from_db.dropna()
    
    # --- Bağimsiz (X) ve Bağimli (y) Değişkenleri Ayirma ---
    X = df_from_db.drop('DEATH_EVENT', axis=1)
    y = df_from_db['DEATH_EVENT']

    # --- Verileri Ölçeklendirme ---
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X = pd.DataFrame(X_scaled, columns=X.columns)

    # --- Veriyi Eğitim ve Test Olarak Bölme ---
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # --- Modelleri Başlatma ve Eğitme ---
    knn_model = KNeighborsClassifier()
    nb_model = GaussianNB()
    dt_model = DecisionTreeClassifier(random_state=42)
    rf_model = RandomForestClassifier(random_state=42)

    knn_model.fit(X_train, y_train)
    nb_model.fit(X_train, y_train)
    dt_model.fit(X_train, y_train)
    rf_model.fit(X_train, y_train)
    print("Bütün modeller başariyla eğitildi!")

    # --- Tahmin ve Değerlendirme ---
    results = [
        ("KNN", knn_model.predict(X_test)),
        ("Naive Bayes", nb_model.predict(X_test)),
        ("Decision Tree", dt_model.predict(X_test)),
        ("Random Forest", rf_model.predict(X_test))
    ]

    print("\n--- Model Değerlendirme Sonuçlari ---")
    for name, preds in results:
        acc = accuracy_score(y_test, preds)
        f1 = f1_score(y_test, preds)
        cm = confusion_matrix(y_test, preds)
        print(f"\n[{name}] Accuracy: {acc:.4f} | F1-Score: {f1:.4f}")
        print(f"Confusion Matrix:\n{cm}")

    # =======================================================
    # --- Modelleri ve Scaler'ı Kaydetme (.pkl) ---
    # NOT: Bu kısım isteğiniz üzerine geçici olarak devre dışı bırakıldı.
    # =======================================================
    # print("\n--- Modeller Kaydediliyor... ---")
    # 
    # model_folder = 'saved_models'
    # if not os.path.exists(model_folder):
    #     os.makedirs(model_folder)
    # 
    # joblib.dump(scaler, f'{model_folder}/scaler.pkl')
    # joblib.dump(knn_model, f'{model_folder}/knn_model.pkl')
    # joblib.dump(nb_model, f'{model_folder}/naive_bayes_model.pkl')
    # joblib.dump(dt_model, f'{model_folder}/decision_tree_model.pkl')
    # joblib.dump(rf_model, f'{model_folder}/random_forest_model.pkl')
    # 
    # print(f"5 adet dosya (4 model + 1 scaler) '{model_folder}' klasörüne kaydedildi.")
    # =======================================================

except Exception as e:
    print(f"Bir hata oluştu: {e}")

finally:
    if 'conn' in locals():
        conn.close()
        print("\nVeritabani bağlantisi kapatildi.")